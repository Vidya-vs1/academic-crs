import os
from fastapi import FastAPI, Form
from pydantic import BaseModel
from typing import Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from crewai import Crew

from agents import (
    create_agents_and_tasks,
    create_profile_extractor_agent,
    extract_profile_with_llm,
    create_qa_task
)
from utils import extract_info_from_text
import json

app = FastAPI()

# ==========================================
# CONFIGURATION MANAGEMENT
# ==========================================
CONFIG_FILE = "config.json"

def get_saved_model_name():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
                return data.get("model_name")
        except:
            pass
    return None

class ProfileRequest(BaseModel):
    text: str
    openrouter_key: str
    openrouter_key_backup: Optional[str] = None
    serper_key: str

class AgentRequest(BaseModel):
    step: int
    profile: dict
    openrouter_key: str
    openrouter_key_backup: Optional[str] = None
    serper_key: str

class QARequest(BaseModel):
    question: str
    context: dict
    openrouter_key: str
    openrouter_key_backup: Optional[str] = None
    serper_key: str

class AdminModelRequest(BaseModel):
    model_name: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ADMIN ENDPOINTS
# ==========================================
@app.get("/admin/model-name")
async def get_model_name():
    saved = get_saved_model_name()
    return {"model_name": saved if saved else "Default (Hardcoded)"}

@app.post("/admin/model-name")
async def update_model_name(data: AdminModelRequest):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump({"model_name": data.model_name}, f)
        return {"status": "success", "model_name": data.model_name}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/extract-profile")
async def extract_profile_route(
    text: str = Form(...),
    openrouter_key: str = Form(...),
    openrouter_key_backup: Optional[str] = Form(None),
    serper_key: str = Form(...)
):
    profile: Dict[str, Any] = {}

    # Step 1: Regex extraction
    profile = extract_info_from_text(text)

    # Check for admin override model
    saved_model = get_saved_model_name()
    agent_kwargs = {}
    if saved_model:
        agent_kwargs["llm_model_name"] = saved_model

    # Step 2: LLM extraction (merge results)
    try:
        extractor_agent = create_profile_extractor_agent(openrouter_key, **agent_kwargs)
        llm_result = extract_profile_with_llm(extractor_agent, text)
    except Exception as e:
        if openrouter_key_backup:
            print(f"Primary key failed in extract_profile: {e}. Retrying with backup key...")
            extractor_agent = create_profile_extractor_agent(openrouter_key_backup, **agent_kwargs)
            llm_result = extract_profile_with_llm(extractor_agent, text)
        else:
            raise e

    output_text = llm_result.raw if hasattr(llm_result, "raw") else str(llm_result)
    try:
        extracted_json = json.loads(output_text)
        if isinstance(extracted_json, dict):
            for k, v in extracted_json.items():
                if v not in (None, "", [], {}):
                    profile[k] = v
    except:
        pass

    return {"profile": profile}


@app.post("/run-agent")
async def run_agent(data: AgentRequest):
    try:
        def execute_run(api_key):
            # Check for admin override model
            saved_model = get_saved_model_name()
            agent_kwargs = {}
            if saved_model:
                agent_kwargs["llm_model_name"] = saved_model

            # Create all agents & tasks (same as before)
            crew, qa_agent, _ = create_agents_and_tasks(
                api_key,
                data.serper_key,
                **agent_kwargs
            )

            # Select only the specific task
            task = crew.tasks[data.step]
            temp_agent = task.agent

            # Run ONLY this one agent using a temp crew
            temp_crew = Crew(
                agents=[temp_agent],
                tasks=[task],
                verbose=True,
                cache=False,
            )

            # Debug: Print keys received in profile to verify data flow
            print(f"Agent {data.step} received profile keys: {list(data.profile.keys())}")

            inputs = {
                "profile": json.dumps(data.profile),
                "user_feedback": data.profile.get("user_feedback") or "None"
            }
            return temp_crew.kickoff(inputs=inputs)

        try:
            result = execute_run(data.openrouter_key)
        except Exception as e:
            if data.openrouter_key_backup:
                print(f"Primary key failed in run_agent: {e}. Retrying with backup key...")
                result = execute_run(data.openrouter_key_backup)
            else:
                raise e

        raw_result = getattr(result, "raw", str(result))
        # Use ASCII-safe printing to avoid Windows console encoding issues
        try:
            preview = raw_result[:500] if isinstance(raw_result, str) else str(raw_result)[:500]
            print(f"Agent {data.step} raw result type: {type(raw_result)}")
            print(f"Agent {data.step} raw result length: {len(raw_result) if isinstance(raw_result, str) else 'N/A'}")
            print(f"Agent {data.step} raw result preview: {preview.encode('ascii', 'replace').decode('ascii')}")
        except Exception as e:
            print(f"Agent {data.step} completed (preview unavailable due to encoding: {e})")
        return {"result": raw_result}
    except Exception as e:
        print(f"Error in run_agent for step {data.step}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "step": data.step}
    finally:
        # Cleanup API keys from environment variables to ensure they don't persist
        os.environ.pop("OPENROUTER_API_KEY", None)
        os.environ.pop("SERPER_API_KEY", None)

@app.post("/qa")
async def qa_route(data: QARequest):
    def execute_qa(api_key):
        # Check for admin override model
        saved_model = get_saved_model_name()
        agent_kwargs = {}
        if saved_model:
            agent_kwargs["llm_model_name"] = saved_model

        # Create QA agent properly
        _, qa_agent, _ = create_agents_and_tasks(
            api_key,
            data.serper_key,
            **agent_kwargs
        )

        qa_crew = create_qa_task(
            qa_agent=qa_agent,
            question=data.question,
            context=json.dumps(data.context),
        )
        return qa_crew.kickoff()

    try:
        try:
            result = execute_qa(data.openrouter_key)
        except Exception as e:
            if data.openrouter_key_backup:
                print(f"Primary key failed in qa: {e}. Retrying with backup key...")
                result = execute_qa(data.openrouter_key_backup)
            else:
                raise e

        return {"answer": result.raw if hasattr(result, "raw") else str(result)}
    finally:
        # Cleanup API keys from environment variables
        os.environ.pop("OPENROUTER_API_KEY", None)
        os.environ.pop("SERPER_API_KEY", None)


@app.get("/")
async def root():
    return {"message": "Backend Running with LLM Agents!"}
