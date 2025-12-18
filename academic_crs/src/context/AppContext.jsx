import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [apiKeys, setApiKeys] = useState(() => {
    const savedOpenRouter = localStorage.getItem("openrouter_key");
    const savedSerper = localStorage.getItem("serper_key");
    return {
      openrouter: savedOpenRouter || "",
      serper: savedSerper || "",
      isSet: !!(savedOpenRouter && savedSerper),
    };
  });

  const resetApiKeys = () => {
    localStorage.removeItem("openrouter_key");
    localStorage.removeItem("serper_key");
    setApiKeys({
      openrouter: "",
      serper: "",
      isSet: false,
    });
    setProfileComplete(false);
    setCurrentAgent(0);
    setAgentResults({
      normalized_profile: null,
      matched_programs: null,
      ranked_programs: null,
      scholarships: null,
      reviews: null,
    });
  };
  const [studentProfile, setStudentProfile] = useState({});
  const [profileComplete, setProfileComplete] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);

  const [theme, setTheme] = useState('dark'); // Default to dark or light

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const [agentResults, setAgentResults] = useState({
    normalized_profile: null,
    matched_programs: null,
    ranked_programs: null,
    scholarships: null,
    reviews: null,
  });

  // Persist API Keys whenever they change and are set
  useEffect(() => {
    if (apiKeys.isSet) {
      localStorage.setItem("openrouter_key", apiKeys.openrouter);
      localStorage.setItem("serper_key", apiKeys.serper);
    }
  }, [apiKeys]);

  return (
    <AppContext.Provider
      value={{
        apiKeys, setApiKeys,
        studentProfile, setStudentProfile,
        profileComplete, setProfileComplete,
        currentAgent, setCurrentAgent,
        processing, setProcessing,
        agentResults, setAgentResults,
        qaHistory, setQaHistory,
        theme, toggleTheme,
        resetApiKeys,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
