import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";
import "./ResultsStep.css";
import PillNav from "./PillNav.jsx";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const Typewriter = ({ text, speed = 50, delay = 0, tag: Tag = 'span', style, className }) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    const chars = Array.from(text);
    const timeout = setTimeout(() => {
      let i = 0;
      const timer = setInterval(() => {
        if (i < chars.length) {
          setDisplayText(chars.slice(0, i + 1).join(''));
          i++;
        } else {
          clearInterval(timer);
        }
      }, speed);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return <Tag className={className} style={style}>{displayText}</Tag>;
};

export default function ResultsStep() {
  const { agentResults, apiKeys, studentProfile, setAgentResults } = useApp();
  const [tab, setTab] = useState("profile");
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rerunLoading, setRerunLoading] = useState(false);

  const handleAskQuestion = async () => {
    if (!qaQuestion.trim()) return;

    setQaLoading(true);
    try {
      const context = {
        profile: agentResults.normalized_profile,
        programs: agentResults.ranked_programs,
        scholarships: agentResults.scholarships,
        reviews: agentResults.reviews,
      };

      const response = await fetch(`${API_BASE}/qa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: qaQuestion,
          context: context,
          openrouter_key: apiKeys.openrouter,
          serper_key: apiKeys.serper,
        }),
      });

      const data = await response.json();
      setQaAnswer(data.answer);
    } catch (error) {
      console.error("Q&A error:", error);
      setQaAnswer("Sorry, there was an error processing your question.");
    } finally {
      setQaLoading(false);
    }
  };

  // Helper to run a single agent step
  const runAgentStep = async (stepIndex, inputData) => {
      const response = await fetch(`${API_BASE_URL}/run-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: stepIndex,
          profile: inputData,
          openrouter_key: apiKeys.openrouter,
          serper_key: apiKeys.serper,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.result;
  };

  // Combined Rerun for Programs (Matcher + Specialist)
  const handleRerunPrograms = async () => {
    if (rerunLoading) return;
    setRerunLoading(true);
    try {
      // Prepare input with feedback
      const baseInput = { ...studentProfile, ...agentResults, user_feedback: feedback };

      // VISUAL FEEDBACK: Clear current programs so user sees "Waiting..." state
      // This ensures the user knows the update is happening.
      setAgentResults(prev => ({ 
        ...prev, 
        matched_programs: null, 
        ranked_programs: null 
      }));

      // Step 1: Matcher
      const matcherResult = await runAgentStep(1, baseInput);
      
      // Update state for Matcher immediately (optional, but good for safety)
      setAgentResults(prev => ({ ...prev, matched_programs: matcherResult }));

      // Step 2: Specialist (MUST use the NEW matcher result)
      const specialistInput = { ...baseInput, matched_programs: matcherResult };
      const specialistResult = await runAgentStep(2, specialistInput);

      // Update final state
      setAgentResults(prev => ({ 
        ...prev, 
        matched_programs: matcherResult, 
        ranked_programs: specialistResult 
      }));

      alert("Programs updated based on your feedback!");
    } catch (error) {
      console.error("Rerun error:", error);
      alert("Error rerunning programs. Check console.");
    } finally {
      setRerunLoading(false);
    }
  };

  const handleRerunAgent = async (agentIndex) => {
    try {
      // Pass accumulated results + feedback
      const agentInput = { ...studentProfile, ...agentResults, user_feedback: feedback };
      const result = await runAgentStep(agentIndex, agentInput);

      // Update the specific agent result
      const keys = [
        "normalized_profile",
        "matched_programs",
        "ranked_programs",
        "scholarships",
        "reviews",
      ];

      const keyToUpdate = keys[agentIndex];

      setAgentResults(prev => ({
        ...prev,
        [keyToUpdate]: result
      }));

      alert(`Agent rerun completed! Results updated.`);

    } catch (error) {
      console.error("Rerun agent error:", error);
      alert("Error rerunning agent. Check console for details.");
    }
  };

  // Simple markdown renderer to prevent crashes and display string data
  const renderMarkdown = (markdownText) => {
    if (typeof markdownText !== 'string') {
      return <pre>{JSON.stringify(markdownText, null, 2)}</pre>;
    }
    return (
      <div className="markdown-container">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" />
            ),
          }}
        >
          {markdownText}
        </ReactMarkdown>
      </div>
    );
  };

  // New parser for string-based profile data
  const parseProfileFromString = (profileString) => {
    const profile = {};
    const lines = profileString.split('\n');
    lines.forEach(line => {
      if (line.includes(':')) {
        const [rawKey, ...valueParts] = line.split(':');
        const key = rawKey.replace(/\*\*/g, '').trim().toLowerCase().replace(/ /g, '_');
        const value = valueParts.join(':').trim();
        
        if (key && value && value !== 'not specified') {
          if (key === 'preferred_locations') {
            profile[key] = value.split(',').map(loc => loc.trim());
          } else {
            profile[key] = value;
          }
        }
      }
    });
    return profile;
  };

  // Parse agent results with fallback handling
  const parseAgentOutput = (rawOutput) => {
    if (!rawOutput) return null;
    
    let cleaned = rawOutput;
    if (typeof rawOutput === 'string') {
      // Remove markdown code blocks if present to ensure JSON parsing works
      cleaned = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Fallback: Try to extract JSON array or object from text if direct parse fails
      if (typeof rawOutput === 'string') {
        try {
          // Find first [ and last ] to extract array
          const firstBracket = rawOutput.indexOf('[');
          const lastBracket = rawOutput.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket > firstBracket) {
            return JSON.parse(rawOutput.substring(firstBracket, lastBracket + 1));
          }
          
          // Find first { and last } to extract object
          const firstBrace = rawOutput.indexOf('{');
          const lastBrace = rawOutput.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            return JSON.parse(rawOutput.substring(firstBrace, lastBrace + 1));
          }
        } catch (e2) {
          // ignore extraction errors
        }
      }
      return rawOutput;
    }
  };

  const profile = parseAgentOutput(agentResults.normalized_profile);
  const programs = parseAgentOutput(agentResults.ranked_programs);
  const scholarships = parseAgentOutput(agentResults.scholarships);
  let reviews = parseAgentOutput(agentResults.reviews);

  if (reviews && typeof reviews === 'object' && !Array.isArray(reviews)) {
    if (Array.isArray(reviews.reviews)) {
      reviews = reviews.reviews;
    } else {
      // Fallback: Check if the reviews are wrapped in a different key (e.g. { "data": [...] })
      const potentialArray = Object.values(reviews).find(val => Array.isArray(val));
      if (potentialArray) reviews = potentialArray;
    }
  }

  console.log("All agent results:", agentResults);
  console.log("Parsed profile:", profile);
  console.log("Parsed programs:", programs);
  console.log("Parsed scholarships:", scholarships);
  console.log("Parsed reviews:", reviews);

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "programs", label: "Programs" },
    { id: "scholarships", label: "Scholarships" },
    { id: "reviews", label: "Reviews" },
    { id: "qa", label: "Q&A" },
  ];

  return (
    <div className="results-container" style={{ color: "var(--text-main)", width: "95%", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Typewriter 
          tag="h1" 
          text="Academic Navigator" 
          speed={100}
          style={{ fontSize: "3.5rem", fontWeight: "bold", marginBottom: "0.5rem", color: "var(--text-main)" }}
        />
        <p style={{ fontSize: "1.5rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          AI-Powered Course & University Recommendations
        </p>
        <Typewriter 
          tag="h2" 
          text=" 🏛️Personalized University Results " 
          speed={50}
          delay={1300}
          style={{ fontSize: "2.8rem", fontWeight: "bold", color: "var(--text-main)", textAlign: "center", display: "block" }}
        />
        <p className="section-description" style={{ textAlign: "center" }}>
          Discover universities that perfectly match your academic profile, goals, and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="nav-container">
        <PillNav
          items={tabs}
          activeId={tab}
          onItemClick={(item) => setTab(item.id)}
          baseColor="var(--nav-base)"
          pillColor="var(--nav-pill)"
          activeTextColor="var(--nav-active-text)"
        />
      </div>

      {/* Content */}
      <div className="tab-content">
        {/* Profile View */}
        {tab === "profile" && (
          <>
            <h3>📌 Standardized Profile Summary</h3>
            <p className="section-description">
              Your profile has been analyzed and standardized for better university matching
            </p>
            {profile ? (
              typeof profile === "string" ? (
                renderMarkdown(profile)
              ) : typeof profile === "object" && profile !== null ? (
                <>
                  <div className="profile-grid">
                    <div>
                      <h4>Basic Information</h4>
                      <p><strong>Name:</strong> {profile.student_name || "Not specified"}</p>
                      <p><strong>Academic Level:</strong> {profile.academic_level || "Not specified"}</p>
                      <p><strong>Current Degree:</strong> {profile.current_degree || "Not specified"}</p>
                      <p><strong>Graduation Year:</strong> {profile.graduation_year || "Not specified"}</p>
                    </div>
                    <div>
                      <h4>Academic Details</h4>
                      <p><strong>Board:</strong> {profile.board || "Not specified"}</p>
                      <p><strong>Class 12 Score:</strong> {profile.class12_score || "Not specified"}</p>
                      <p><strong>CGPA:</strong> {profile.cgpa || "Not specified"}</p>
                      <p><strong>Competitive Exams:</strong> {profile.competitive_exams || "Not specified"}</p>
                    </div>
                    <div>
                      <h4>Goals & Preferences</h4>
                      <p><strong>Career Goal:</strong> {profile.career_goal || "Not specified"}</p>
                      <p><strong>Specialization:</strong> {profile.specialization || "Not specified"}</p>
                      <p><strong>Budget:</strong> {profile.budget || "Not specified"}</p>
                      <p><strong>Preferred Locations:</strong> {Array.isArray(profile.preferred_locations) ? profile.preferred_locations.join(", ") : profile.preferred_locations || "Not specified"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <pre>{JSON.stringify(profile, null, 2)}</pre>
              )
            ) : (
              <p>⏳ Waiting for profile data...</p>
            )}
          </>
        )}

        {/* Programs */}
        {tab === "programs" && (
          <>
            <h2>📊 Ranked University Programs </h2>
            <p className="section-description">
              Top university programs ranked by compatibility with your profile and preferences
            </p>
            {programs ? (
              typeof programs === "string" ? (
                renderMarkdown(programs)
              ) : Array.isArray(programs) ? (
                <div style={{ position: "relative" }}>
                  {programs.map((p, i) => (
                    <div key={i} className="item-card program-card">
                      <h4>#{i + 1} — {p.course_name || p.program} @ {p.university_name || p.university}</h4>
                      <p><strong>📍 Location:</strong> {p['country_/_location'] || p.location}</p>
                      <p><strong>🎓 Degree:</strong> {p.degree_level}</p>
                      <p><strong>📖 Description:</strong> {p.program_description}</p>
                      <p><strong>💰 Tuition:</strong> {p.tuition_fee}</p>
                      <p><strong>🏠 Living Cost:</strong> {p.living_cost}</p>
                      {p.university_website_url && (
                        <p><strong>🌐 Website:</strong> <a href={p.university_website_url} target="_blank" rel="noopener noreferrer" className="url-university website-link url-external">{p.university_website_url}</a></p>
                      )}
                      <div className="pros-cons">
                        {p.pros && <div><strong>✅ Pros:</strong><ul>{p.pros.map((pro, idx) => <li key={idx}>{pro}</li>)}</ul></div>}
                        {p.cons && <div><strong>⚠️ Cons:</strong><ul>{p.cons.map((con, idx) => <li key={idx}>{con}</li>)}</ul></div>}
                      </div>
                      {p.career_alignment_score && (
                        <p className="career-score">
                          <strong>🎯 Career Alignment Score: {p.career_alignment_score}/10</strong>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <pre>{JSON.stringify(programs, null, 2)}</pre>
              )
            ) : (
              <p>⏳ Waiting for program results...</p>
            )}
          </>
        )}

        {/* Scholarships */}
        {tab === "scholarships" && (
          <>
            <h2>🎓 Scholarship Opportunities</h2>
            <p className="section-description">
              Financial aid and scholarship options to support your academic journey
            </p>
            {scholarships ? (
              typeof scholarships === "string" ? (
                renderMarkdown(scholarships)
              ) : Array.isArray(scholarships) && scholarships.length > 0 ? (
                scholarships.map((s, i) => (
                  <div key={i} className="item-card">
                    <h4>{s.scholarship_name || s.name}</h4>
                    <p><strong>💰 Amount:</strong> {s.amount}</p>
                    <p><strong>📋 Eligibility:</strong> {s.eligibility}</p>
                    <p><strong>📅 Deadline:</strong> {s.deadline}</p>
                    <p><strong>🔗 Link:</strong> <a href={s.link} target="_blank" rel="noopener noreferrer" className="url-scholarship url-external">{s.link}</a></p>
                  </div>
                ))
              ) : (
                <p>No scholarships found.</p>
              )
            ) : (
              <p>⏳ Waiting for scholarship results...</p>
            )}
          </>
        )}

        {/* Reviews */}
        {tab === "reviews" && (
          <>
            <h2>⭐ Student Reviews & Experiences</h2>
            <p className="section-description">
              Real student feedback and experiences from these universities and programs
            </p>
            {reviews ? (
              typeof reviews === "string" ? (
                renderMarkdown(reviews)
              ) : Array.isArray(reviews) ? (
                reviews.map((r, i) => (
                  <div key={i} className="item-card program-card">
                    <h4>#{i + 1} — {String(r.university || "University").replace(/\*\*/g, '').trim()} — {String(r.program || "Program").replace(/\*\*/g, '').trim()}</h4>
                    <p><strong>📊 Overall Sentiment:</strong> {r.overall_sentiment}</p>
                    <div className="pros-cons" style={{ marginTop: "1rem" }}>
                      <div>
                        <strong>👍 Praise:</strong>
                        {Array.isArray(r.praise) ? (
                          <ul>{r.praise.map((p, idx) => <li key={idx}>{p}</li>)}</ul>
                        ) : <p>{r.praise}</p>}
                      </div>
                      <div>
                        <strong>👎 Concerns:</strong>
                        {Array.isArray(r.concerns) ? (
                          <ul>{r.concerns.map((c, idx) => <li key={idx}>{c}</li>)}</ul>
                        ) : <p>{r.concerns}</p>}
                      </div>
                    </div>
                    <p style={{ marginTop: "1rem" }}><strong>📝 Summary:</strong> {r.summary}</p>
                  </div>
                ))
              ) : (
                <pre>{JSON.stringify(reviews, null, 2)}</pre>
              )
            ) : (
              <p>⏳ Waiting for reviews...</p>
            )}
          </>
        )}

        {/* Q&A */}
        {tab === "qa" && (
          <>
            <h2>💬 Ask Questions</h2>
            <p className="section-description">
              Get personalized answers about your university recommendations and application process
            </p>
            <div className="qa-section">
              <textarea
                placeholder="Ask a question about your recommendations, application process, or university details..."
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                style={{ fontSize: "1.1rem" }}
              />
              <button onClick={handleAskQuestion} disabled={!qaQuestion.trim() || qaLoading} style={{ fontSize: "1.1rem", padding: "12px 24px" }}>
                {qaLoading ? "🤔 Thinking..." : " Ask Question"}
              </button>
            </div>
            {qaAnswer && (
              <div className="qa-answer">
                <h4>💡 Answer:</h4>
                <p>{qaAnswer}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rerun Agents Box */}
      <div className="rerun-box">
        <h4>🔄 Not satisfied with results?</h4>
        <p>Provide feedback to refine the recommendations:</p>
        
        <textarea 
          className="feedback-textarea"
          placeholder="E.g., 'I want cheaper universities', 'Focus more on Germany', or 'I need full scholarships'..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <div className="rerun-buttons">
          <button 
            onClick={handleRerunPrograms} 
            disabled={rerunLoading}
            style={{ fontSize: "1rem", padding: "10px 20px", backgroundColor: "var(--primary-brand)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", opacity: rerunLoading ? 0.7 : 1 }}
          >
            {rerunLoading ? "⏳ Rerunning..." : "🚀 Rerun Programs (Match & Rank)"}
          </button>
          <button onClick={() => handleRerunAgent(3)} style={{ fontSize: "1rem", padding: "10px 20px" }}>
            🎓 Rerun Scholarships
          </button>
          <button onClick={() => handleRerunAgent(4)} style={{ fontSize: "1rem", padding: "10px 20px" }}>
            ⭐ Rerun Reviews
          </button>
        </div>
      </div>
    </div>
  );
}
