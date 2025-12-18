import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

export const extractProfile = async (formData) => {
  const res = await axios.post(`${API_BASE}/extract-profile`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const runAgent = async (step, profile, openrouter_key, serper_key) => {
  const res = await axios.post(`${API_BASE}/run-agent`, {
    step,
    profile,
    openrouter_key,
    serper_key,
  });
  return res.data;
};

export const askQuestion = async (question, context, openrouter_key, serper_key) => {
  const res = await axios.post(`${API_BASE}/qa`, {
    question,
    context,
    openrouter_key,
    serper_key,
  });
  return res.data;
};
