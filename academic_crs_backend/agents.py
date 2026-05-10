# agents.py
import os
from crewai import Agent, Task, Crew, LLM
from crewai_tools import SerperDevTool, ScrapeWebsiteTool


def create_agents_and_tasks(
    openrouter_api_key: str, 
    serper_api_key: str, 
    llm_model_name: str = "openrouter/mistralai/devstral-2512:free",
    agent_settings: dict = None
):
    os.environ["OPENROUTER_API_KEY"] = openrouter_api_key
    os.environ["SERPER_API_KEY"] = serper_api_key

    serper_tool = SerperDevTool()
    scrape_tool = ScrapeWebsiteTool()

    # Helper to fetch settings safely with defaults
    settings = agent_settings or {}

    # Auto-fix: Prepend 'openrouter/' if missing but looks like a vendor/model string
    if not llm_model_name.startswith("openrouter/") and "/" in llm_model_name and "gpt" not in llm_model_name:
        llm_model_name = f"openrouter/{llm_model_name}"

    # Main LLM
    llm = LLM(
        model=llm_model_name,
        temperature=settings.get("temperature", 0.1),
        base_url="https://openrouter.ai/api/v1",
        api_key=openrouter_api_key,
    )

    # =========================
    # NORMALIZER AGENT (kept, but verbose off)
    # =========================
    normalizer_agent = Agent(
        role="Search-Optimized Data Normalizer",
        goal="""Clean and standardize student profile data for optimal university search queries.

You will receive a JSON-like profile object that MAY contain:
- academic_level (e.g., "high_school", "undergraduate", "postgraduate", "working_professional")
- student_name
- current_degree
- graduation_year
- cgpa
- board
- class12_score
- competitive_exams (list of strings, e.g., "Exam Name: Score/Rank")
- career_goal
- preferred_locations
- budget
- specialization
- raw_user_text (the original free-text description from the student)
- user_feedback (optional feedback from the user for reruns)

Your job:
1. **DATA FORMATTING**: Convert complex objects (like exams) into clear strings to prevent frontend errors.
2. **STANDARDIZE KEY FIELDS**:
   - Academic levels: "high_school", "undergraduate", "postgraduate", "working_professional"
   - Budget: Convert to searchable ranges (e.g., "10-15 lakhs", "50000-75000 USD")
   - Specializations: Standardize names for better search matching
   - Locations: Use full country names, prefer "United States" over "US"
3. **PRESERVE SEARCH CONTEXT**: Keep exam details, specific scores, unique identifiers, and user_feedback
4. **FILTERING**: Remove ALL fields that are null, empty, "not specified", or "N/A". The output JSON must ONLY contain fields with actual, meaningful values.
5. **OUTPUT**: Return ONLY a clean JSON object with standardized fields

CRITICAL RULES:
- Return valid JSON only - no markdown, no bold formatting, no explanatory text
- Include all fields with meaningful values, even if brief
- Focus on data that helps create precise search queries like "University Program international tuition 2024"
- **FLATTEN OBJECTS**: Ensure `competitive_exams` is a list of strings, NOT objects.""",
        backstory="""You are a data quality specialist focused on optimizing student profiles for accurate university searches.
You understand how search engines work and ensure data consistency that leads to better match results.
You prioritize search relevance over presentation aesthetics.""",
        tools=[],
        llm=llm,
        verbose=False,
    )

    # =========================
    # MATCHER AGENT (OPTIMIZED)
    # =========================
    matcher_agent = Agent(
    role="University Matcher",
    goal="""
Recommend accurate university–program matches using REAL data from Serper search. Output MUST be a valid JSON array.

CRITICAL RULES FOR ACCURACY:
- Use Serper 1–3 times max; reuse results.
- **NO HALLUCINATIONS**: Do NOT invent fees or programs. Only use info found in snippets. If exact fee not found, state "Not available". DO NOT ESTIMATE OR RANDOMIZE FEES.
- **BUDGET & ACHIEVABILITY**: Prioritize programs that actually fit the student's budget and academic profile (GPA, exams). If a university is too expensive or competitive (e.g., Ivy League without SATs), do not recommend it unless explicitly asked, and label it as "High Reach".
- Undergrad students → recommend Bachelor programs.
- Others → recommend Master/Postgrad programs.
- **ADMISSION REALITY CHECK**: If a university is highly competitive (e.g., IITs, Ivy League), YOU MUST CHECK and mention the required entrance exams (JEE, SAT, etc.). Do not recommend them as "easy" matches.
- **BUDGET CHECK**: If the user has a strict low budget, prioritize institutions that actually fit or are close. If only expensive options exist, explicitly state that budget is exceeded.
- **FEEDBACK HANDLING**: If `user_feedback` is provided, YOU MUST prioritize it. If the user specifies a Rank (e.g. "JEE Rank 1500") or Budget, ONLY recommend options that realistically accept that rank/budget. Do NOT ignore constraints.

SEARCH BEHAVIOR:
- Form precise queries like:
  "<University> <Program> duration tuition fees 2024" (Use 'international' ONLY if studying abroad)
  "<Program> colleges in <Location> fees"
  "site:<university domain> tuition"
  "<University> <Program> admission requirements entrance exam"
- Extract fee, duration, location, and requirements from snippets.

OUTPUT FORMAT:
Return a STRICT JSON ARRAY of objects. Do NOT wrap in markdown code blocks.
Example structure:
[
  {
    "university": "University Name",
    "program": "Program Name",
    "degree_level": "Bachelor/Master",
    "location": "City, Country",
    "duration": "2 years",
    "tuition": "15000 USD",
    "living_cost": "10000 USD",
    "total_cost": "25000 USD",
    "requirements": "IELTS 6.5, GPA 3.0",
    "website": "URL",
    "fit_reason": "Fits budget..."
  }
]
""",
    backstory="You provide verified, budget-aware study-abroad recommendations. You are realistic about admission chances.",
    tools=[serper_tool],
    llm=llm,
    verbose=False,
)

    # =========================
    # SPECIALIST AGENT (OPTIMIZED – no tools)
    # =========================
    specialist_agent = Agent(
        role="University Program Specialist",
        goal="""
From the matcher's results, evaluate and rank the top programs (aim for top 5–6),
whether they are undergraduate or postgraduate.

For each recommended program, clearly present:
- Course Name
- University Name
- Degree Level
- Duration
- Country / Location
- Tuition Fee: (Extract the 'Tuition per year' from the context. State the actual yearly fee and currency. If "Not available", state "Check website").
- Living Cost: (Extract the 'Living cost per year' from the context. State the estimated yearly cost, especially for international students).
- Program Description (Write a detailed 3-4 sentence description highlighting curriculum and unique features).
- University Website URL (Include the link provided by the matcher or find it).
- Pros (2–4 points)
- Cons (1–3 points)
- Admission Difficulty: (Mention acceptance rates or required exams like JEE/SAT).
- Career Alignment Score (1–10)

After listing the ranked programs, give a brief final recommendation summary
explaining which one or two programs are the best fit and WHY.

You MUST base all facts on the matcher's output; do NOT invent new hard facts or fees.
exact fee numbers or admission cutoffs. Be critical about "Reach" schools.
If `user_feedback` is provided, ensure the ranking and explanation directly address the user's concerns.""",
        backstory="""
You are a highly experienced academic consultant specializing in global university programs,
rankings, ROI, graduate outcomes, and curriculum evaluation. You help students understand which
programs suit their goals, budget, and interests, while explaining trade-offs clearly.""",
        tools=[],  # no extra web calls here – just reason over matcher output
        llm=llm,
        verbose=False,
    )

    # =========================
    # SCHOLARSHIP AGENT (OPTIMIZED)
    # =========================
    scholarship_agent = Agent(
        role="Scholarship Finder",
        goal="""Find at least 3-5 relevant scholarships based on the student profile and top-ranked universities.

Adapt to both undergraduate and postgraduate cases.

Provide a concise overview of 3-5 good funding opportunities. Do NOT stop after just one.
For each scholarship, include:
- Scholarship name
- Amount (rough or range, with currency)
- Eligibility (UG/PG, nationality, scores, exams, etc.)
- Application deadline (month/year or "rolling" if not clear)
- Official website or application link (if available)

If you cannot find good matches, say so honestly and suggest general funding strategies
(government schemes, university-level aid, assistantships, etc.).

OUTPUT RULES:
- Return the Final Answer as a clean, formatted list.
- STOP immediately after providing the list. Do NOT output internal thoughts, "Observation:", or "Thought:" after the final answer.""",
        backstory="""You are a funding advisor with access to global scholarship data.
You excel at surfacing accurate, recent opportunities that match the student's profile.
You communicate funding options in an encouraging, practical way using natural language.""",
        # Keep Serper for light search, drop Scrape to avoid heavy scraping
        tools=[serper_tool],
        llm=llm,
        verbose=False,
    )

    # =========================
    # REVIEWS AGENT (OPTIMIZED)
    # =========================
    reviews_agent = Agent(
        role="Reviews Collector",
        goal="""Gather a brief, balanced review summary for the top-ranked universities/programs
(undergraduate or postgraduate).

Use a small number of credible sources (forums, student platforms, review sites).
Avoid over-searching; find patterns, not exhaustiveness.

For each recommended program/university, provide:
- Overall Sentiment (Positive/Mixed/Negative)
- Key Praise (2-3 bullet points)
- Key Concerns (1-2 bullet points)
 - Summary (1-2 sentences)

Be concise and avoid long essays. Do NOT fabricate precise statistics or fake quotes.
Do NOT include citation markers (e.g. [REF], [1]) in the output.""",
        backstory="""You are a student experience researcher who specializes in finding balanced,
multi-source reviews. You avoid bias and provide a reliable picture of academic and campus life.
You share insights in an engaging, relatable way that helps students understand what to expect.""",
        tools=[serper_tool],
        llm=llm,
        verbose=False,
    )

    # =========================
    # Q&A AGENT (KEPT, slight tightening)
    # =========================
    qa_agent = Agent(
        role="Application Guide & Consultant",
        goal="""Answer student questions clearly and professionally based on research context.

CRITICAL OUTPUT RULES:
1. **STRICT MARKDOWN**: Use `##` for headers. Use `-` for bullet points.
2. **SPACING**: Put a blank line before and after every header and list item.
3. **NO WALLS OF TEXT**: Do not write long paragraphs. Break them up.
4. **DIRECT ANSWER**: Start with a direct answer.
5. **NO META-TALK**: Do not output "Thought:", "Action:", or "I will now answer".
6. **ACCURACY**: Use the provided context. If info is missing, search for it.""",
        backstory="""You are a friendly and articulate academic counselor. You excel at explaining complex university details in simple, structured, and easy-to-read formats.""",
        tools=[serper_tool, scrape_tool],
        llm=llm,
        verbose=False,
    )

    # =========================
    # TASKS (SHORTENED DESCRIPTIONS → SPEED)
    # =========================

    normalize_task = Task(
        description="""You are given a student profile object under {{profile}} (may include structured fields and raw text).
Clean it, standardize the key fields, and produce a search-optimized JSON output.

Focus on:
1. **Data Quality**: Standardize academic levels, budget ranges, specializations, and locations
2. **Search Optimization**: Preserve details that help create precise university search queries
3. **Field Standardization**: Use consistent formats for better matching
4. **Filtering**: Remove any field that does not have a specific value provided by the user.
5. **Context Preservation**: Keep competitive exam details and specific scores

Return ONLY a valid JSON object with standardized profile fields. No markdown formatting, no bold text, no explanatory content.""",
        expected_output="""A clean JSON object with standardized profile fields optimized for university search queries.""",
        agent=normalizer_agent,
    )

    match_universities_task = Task(
        description="""Use the normalized student profile from {{profile}} and, following your goal as University Matcher,
identify a small set (about 6–8) of the best-fit universities and programs that are achievable and within budget.
If {{user_feedback}} is provided and not "None", use it to DRASTICALLY refine the search. If the user mentions a specific Rank or Score, filter out universities that require a better rank.

Return ONLY a valid JSON array as specified in your goal.""",
        expected_output="""A valid JSON array of university-program matches.""",
        agent=matcher_agent,
    )

    rank_programs_task = Task(
        description="""Analyze the university + program recommendations provided in the 'matched_programs' field within {{profile}}.
(This field contains the JSON output from the University Matcher).

Evaluate and rank the top ~5 programs, following your specialist goal.
If {{user_feedback}} is provided and not "None", ensure the ranking reflects these new preferences.
Keep the output clear, structured, and not excessively long.""",
        expected_output="""A ranked list of top programs with pros, cons, and a final recommendation summary.""",
        agent=specialist_agent,
    )

    find_scholarships_task = Task(
        description="""Find scholarships relevant to the student's profile and the ranked programs in {{profile}}.
If {{user_feedback}} is provided, prioritize scholarships that align with it.

Provide a small set of the most relevant opportunities, with key details as per your goal.
Be concise.""",
        expected_output="""A concise list of relevant scholarships and/or funding options.""",
        agent=scholarship_agent,
    )

    collect_reviews_task = Task(
        description="""Analyze the 'ranked_programs' section (or Specialist Agent output) in {{profile}}.
Identify ONLY the universities and programs that were recommended in that specific list.
Do NOT fetch reviews for any other universities (e.g. from the broader matcher list).

Gather short, balanced review summaries for ONLY those top-ranked universities/programs.
Consider {{user_feedback}} if relevant.

Provide balanced, honest, and concise review overviews, following your goal.""",
        expected_output="""Brief review summaries for ONLY the universities/programs recommended by the Specialist Agent.""",
        agent=reviews_agent,
    )

    crew = Crew(
        agents=[
            normalizer_agent,
            matcher_agent,
            specialist_agent,
            scholarship_agent,
            reviews_agent,
        ],
        tasks=[
            normalize_task,
            match_universities_task,
            rank_programs_task,
            find_scholarships_task,
            collect_reviews_task,
        ],
        verbose=True,  # this is crew-level logging; agents themselves are quieter now
    )

    return crew, qa_agent, llm  # qa_agent is created above


# =========================
# PROFILE EXTRACTOR AGENT (UNCHANGED, LLM-BASED)
# =========================
def create_profile_extractor_agent(
    openrouter_api_key: str, 
    llm_model_name: str = "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    agent_settings: dict = None
):
    settings = agent_settings or {}

    # Auto-fix: Prepend 'openrouter/' if missing
    if not llm_model_name.startswith("openrouter/") and "/" in llm_model_name and "gpt" not in llm_model_name:
        llm_model_name = f"openrouter/{llm_model_name}"

    llm = LLM(
        model=llm_model_name,
        temperature=settings.get("temperature", 0.1),
        base_url="https://openrouter.ai/api/v1",
        api_key=openrouter_api_key,
    )

    profile_extractor_agent = Agent(
        role="Profile Information Extractor",
        goal="""Extract and structure student profile information from natural language text
for ANY academic level (high-school, undergraduate, postgraduate, working professional).

Identify all relevant details about the student's background, goals, and preferences.
Provide accurate, complete extraction with proper validation, but do NOT invent values.

If the input text is too vague to determine at least an academic level and a subject/career goal, you MUST ask a follow-up question in the `missing_info` field.

OUTPUT:
Return ONLY a single valid JSON object with keys such as:
student_name, academic_level, current_degree, graduation_year, board, class12_score,
cgpa, competitive_exams (list of strings, e.g. ["Exam: Score"], NOT objects), career_goal, preferred_locations, budget, specialization,
intended_degree_level, missing_info.

IMPORTANT: Include ONLY keys for fields where the user has provided information. Do NOT include keys with null, "unknown", or empty values (except `missing_info` if needed).
If info is missing, set "missing_info" to a string containing the follow-up question. Do not output markdown formatting.""",
        backstory="""You are an expert at analyzing student profiles and extracting structured information.
You carefully parse text to identify academic background, test scores, career goals, financial constraints,
and country/field preferences.""",
        tools=[],
        llm=llm,
        verbose=False,
    )

    return profile_extractor_agent


def extract_profile_with_llm(profile_extractor_agent, text: str):
    task = Task(
        description=f"""Extract the student's profile from this text and output ONLY one valid JSON object:

TEXT:
{text}""",
        expected_output="""A single JSON object with the profile fields as described in the agent goal.""",
        agent=profile_extractor_agent,
    )

    crew = Crew(
        agents=[profile_extractor_agent],
        tasks=[task],
        verbose=True,
    )

    result = crew.kickoff()
    return result


# =========================
# Q&A TASK CREATOR
# =========================
def create_qa_task(qa_agent, question: str, context: str):
    qa_task = Task(
        description=f"""
Analyze the provided context and answer the student's question.

QUESTION:
"{question}"

CONTEXT:
{context}

INSTRUCTIONS:
- If the answer is in the context, summarize it clearly.
- If not, use the search tool to find it.
- **Structure your answer** exactly like this template:

## Summary
(Direct answer to the question)

## Key Details
- **Point 1**: Description
- **Point 2**: Description

## Recommendation
(Actionable advice)

- Do NOT mention "Context" or "JSON" in the final output.
- Do NOT output internal thoughts.
- **IMPORTANT**: Ensure there are actual newlines between headers and lists.""",
        expected_output="""A well-structured Markdown response with clear headers, bullet points, and spacing.""",
        agent=qa_agent,
    )

    return Crew(
        agents=[qa_agent],
        tasks=[qa_task],
        verbose=True,
    )
