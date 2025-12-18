import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";
import { extractProfile } from "../services/api.js";
import "./ProfileStep.css";
import AdminModelSelector from "./AdminModelSelector";

export default function ProfileStep() {
  const { setStudentProfile, setProfileComplete, apiKeys, setApiKeys } = useApp();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);

  // Typewriter effect state
  const [titleText, setTitleText] = useState("");
  
  useEffect(() => {
    const fullTitle = "Academic Navigator";
    let index = 0;
    const timer = setInterval(() => {
      setTitleText(fullTitle.slice(0, index + 1));
      index++;
      if (index > fullTitle.length) clearInterval(timer);
    }, 60);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try using Google Chrome, Microsoft Edge, or Safari. If using a local network IP, ensure HTTPS is enabled.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setText(prev => prev + (prev && !prev.endsWith(" ") ? " " : "") + finalTranscript);
      }
      setInterimText(currentInterim);
    };
    recognition.start();
  };


  const handleSubmit = async () => {
    if (!text.trim()) return alert("Please enter your profile details!");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("openrouter_key", apiKeys.openrouter);
      formData.append("serper_key", apiKeys.serper);

      const res = await extractProfile(formData);
      const extracted = res.profile || {};

      if (extracted.missing_info) {
        alert("AI Advisor: " + extracted.missing_info);
        setLoading(false);
        return;
      }

      setStudentProfile({
        raw_user_text: text,
        normalized_profile: {
          academic_level: extracted.academic_level || "undergraduate",
          student_name: extracted.student_name || null,
          current_degree: extracted.current_degree || null,
          graduation_year: extracted.graduation_year || null,
          board: extracted.board || null,
          class12_score: extracted.class12_score || null,
          cgpa: extracted.cgpa || null,
          competitive_exams: extracted.competitive_exams || [],
          career_goal: extracted.career_goal || null,
          preferred_locations: extracted.preferred_locations || [],
          budget: extracted.budget || null,
          specialization: extracted.specialization || null,
        }
      });

      setProfileComplete(true);

    } catch (err) {
      console.error(err);
      alert("Failed to analyze profile. Try again!");
    }
    setLoading(false);
  };

   

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setApiKeys({ isSet: false })}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
            textDecoration: "underline",
            cursor: "pointer",
            marginBottom: "1rem"
          }}
        >
          Change API Key
        </button>
      </div>
      <h1 style={{ color: "var(--text-main)", fontSize: "3.5rem", fontWeight: "bold", marginBottom: "1rem", minHeight: "4.2rem" }}>
        {titleText}
      </h1>
      <h2 style={{ fontSize: "1.8rem", color: "var(--text-secondary)", marginBottom: "2rem", fontWeight: "normal" }}>
        AI-Powered Course & University Recommendations
      </h2>
      <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", marginBottom: "2rem", fontStyle: "italic" }}>
        Hi there! Tell me about your grades, interests, and dreams. I'll find the perfect universities for you.
      </p>

      <textarea
        rows={12}
        style={{ width: "100%", padding: 15, backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "2px solid var(--input-border)", borderRadius: "8px", fontSize: "1.1rem" }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type like you're chatting with a friend... &#10;&#10;Example: I'm a high school student interested in Computer Science. I scored 92% in Class 12 with CBSE board. I want to pursue B.Tech in AI/ML and am interested in universities in the US or Canada. My budget is around 20-25 lakhs. I've appeared for JEE and scored 1500 AIR."
      />
      
      <div style={{ marginTop: 15, display: 'flex', gap: '15px', alignItems: 'center' }}>
        <button 
          onClick={toggleListening} 
          disabled={!isSupported}
          title={!isSupported ? "Voice input not supported in this browser" : ""}
          style={{ backgroundColor: isListening ? '#e53e3e' : (!isSupported ? '#a0aec0' : '#4a5568'), width: 'auto', fontSize: "1.1rem", padding: "12px 24px", cursor: !isSupported ? 'not-allowed' : 'pointer', opacity: !isSupported ? 0.7 : 1 }}
        >
          {isListening ? "🛑 Stop Recording" : "🎤 Voice Input"}
        </button>
        {isListening && (
          <div className="voice-visualizer">
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
          </div>
        )}
        {isListening && interimText && (
          <span style={{ color: "var(--primary-brand, #007bff)", fontStyle: "italic" }}>{interimText}...</span>
        )}

      </div>

      <button disabled={loading} style={{ marginTop: 20, fontSize: "1.2rem", padding: "15px 30px" }} onClick={handleSubmit}>
        {loading ? "Processing..." : "Analyze My Profile →"}
      </button>

      {/* Admin Configuration Section */}
      <AdminModelSelector />
    </div>
  );
}
