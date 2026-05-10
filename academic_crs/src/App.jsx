import React, { useEffect, useState } from "react";
import lightBg from "./assets/light.jpg";
import darkBg from "./assets/dark.png";
import ApiKeysStep from "./components/ApiKeysStep.jsx";
import ProfileStep from "./components/ProfileStep.jsx";
import AgentsStep from "./components/AgentsStep.jsx";
import ResultsStep from "./components/ResultsStep.jsx";
import { useApp } from "./context/AppContext.jsx";
import "./App.css";
import { runAgent } from "./services/api.js";

function App() {
  const {
    apiKeys,
    profileComplete,
    currentAgent,
    setCurrentAgent,
    theme,
    toggleTheme,
    studentProfile,
    setStudentProfile,
    setAgentResults,
    setProcessing,
    resetApiKeys
  } = useApp();
  
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : 'dark-mode';
  }, [theme]);

  // Agent Execution Loop
  useEffect(() => {
    if (profileComplete && currentAgent < 5) {
      const executeAgent = async () => {
        setProcessing(true);
        setApiError(null); // Clear previous errors
        try {
          const res = await runAgent(currentAgent, studentProfile, apiKeys.openrouter, apiKeys.serper);
          
          if (res?.error) {
            throw new Error(`Backend Error: ${res.error}`);
          }
          
          const raw = res?.result;
          
          const keys = ["normalized_profile", "matched_programs", "ranked_programs", "scholarships", "reviews"];
          setAgentResults(prev => ({ ...prev, [keys[currentAgent]]: raw }));

          setStudentProfile(prev => {
            let parsed = raw;
            if (typeof raw === 'string') {
              try {
                // Strip markdown code blocks before parsing
                const cleaned = raw.replace(/^```(?:json)?\n|\n```$/gm, '').trim();
                parsed = JSON.parse(cleaned);
              } catch (e) {
                // Not JSON, keep as string
              }
            }
            return { ...prev, [keys[currentAgent]]: parsed };
          });

          // Proceed to next agent
          setTimeout(() => setCurrentAgent(prev => prev + 1), 800);
        } catch (err) {
          console.error(`Agent ${currentAgent} failed:`, err);
          setProcessing(false);
          
          // Display error in UI
          const errorMessage = err.message || "Unknown error";
          setApiError(errorMessage);
        }
      };
      executeAgent();
    } else if (currentAgent === 5) {
      setProcessing(false);
    }
  }, [currentAgent, profileComplete]);

  let currentStep;

  if (!apiKeys.isSet) {
    currentStep = <ApiKeysStep />;
  } else if (!profileComplete) {
    currentStep = <ProfileStep />;
  } else if (currentAgent < 3) { 
    // Show AgentsStep for 0 (Normalizer), 1 (Matcher), 2 (Specialist)
    // Once Specialist finishes (currentAgent becomes 3), show ResultsStep
    currentStep = <AgentsStep />;
  } else {
    currentStep = <ResultsStep />;
  }

  return (
    <div
  className="app-container"
  style={{
    minHeight: "100vh",
    backgroundImage: `url(${theme === "light" ? lightBg : darkBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
    transition: "background-image 0.3s ease-in-out"
  }}
>

      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 15px',
          borderRadius: '20px',
          border: 'none',
          backgroundColor: theme === 'light' ? '#333' : '#fff',
          color: theme === 'light' ? '#fff' : '#333',
          cursor: 'pointer',
          zIndex: 9999,
          fontWeight: 'bold',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
      
      {/* API Keys Status Indicator */}
      {apiKeys.isSet && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '15px',
          fontSize: '0.8rem',
          zIndex: 9999,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          🔑 API Keys Ready
        </div>
      )}
      <div className="content">{currentStep}</div>
      
      {/* API Error Reset Option */}
      {apiError && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ff4444',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
            ⚠️ API Error Detected
          </p>
          <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem' }}>
            {apiError}
          </p>
          <button
            onClick={() => {
              resetApiKeys();
              setApiError(null);
            }}
            style={{
              backgroundColor: 'white',
              color: '#ff4444',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginRight: '10px'
            }}
          >
            🔑 Reset API Keys
          </button>
          <button
            onClick={() => setApiError(null)}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid white',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
