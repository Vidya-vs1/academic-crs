import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";

export default function ApiKeysStep() {
  const { setApiKeys } = useApp();
  const [openrouter, setOpenrouter] = useState("");
  const [serper, setSerper] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!openrouter || !serper) {
      setError("Please enter both API keys.");
      return;
    }
    setApiKeys({ openrouter, serper, isSet: true });
  };

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: "0 auto", color: "var(--text-main)", textAlign: "center" }}>
      <h1 style={{ color: "var(--text-main)", fontSize: "3.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Academic Navigator
      </h1>
      <p style={{ fontSize: "1.5rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
        AI-Powered Course & University Recommendations
      </p>
      <h2 style={{ fontSize: "2.2rem", marginBottom: "1rem", fontWeight: "normal", color: "var(--text-secondary)" }}>Enter API Keys</h2>
      <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", marginBottom: "2rem", fontStyle: "italic" }}>
        Securely connect to our AI-powered university matching system
      </p>

      <div style={{ textAlign: "left", marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "1.1rem", fontWeight: "600" }}>
          OpenRouter API Key (<a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: "#4fd1c5" }}>Get Key</a>)
        </label>
        <input
          type="password"
          placeholder="sk-or-..."
          value={openrouter}
          onChange={(e) => setOpenrouter(e.target.value)}
          style={{ width: "100%", padding: 15, borderRadius: "8px", border: "2px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)", outline: "none", fontSize: "1.1rem" }}
        />
      </div>

      <div style={{ textAlign: "left", marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "1.1rem", fontWeight: "600" }}>
          Serper API Key (<a href="https://serper.dev/" target="_blank" rel="noopener noreferrer" style={{ color: "#4fd1c5" }}>Get Key</a>)
        </label>
        <input
          type="password"
          placeholder="Serper API Key"
          value={serper}
          onChange={(e) => setSerper(e.target.value)}
          style={{ width: "100%", padding: 15, borderRadius: "8px", border: "2px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)", outline: "none", fontSize: "1.1rem" }}
        />
      </div>

      {error && <p style={{ color: "red", fontSize: "1.1rem" }}>{error}</p>}

      <button style={{ marginTop: 20, fontSize: "1.2rem", padding: "15px 30px" }} onClick={handleSave}>
        Save & Continue →
      </button>
    </div>
  );
}
