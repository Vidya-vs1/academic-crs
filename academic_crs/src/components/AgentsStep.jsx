import React from "react";
import { useApp } from "../context/AppContext.jsx";

export default function AgentsStep() {
  const { agentResults, currentAgent } = useApp();

  const agentNames = [
    "Normalizing your Profile",
    "Finding University Matches",
    "Ranking Best Options",
    "Identifying Scholarships",
    "Collecting Student Reviews",
  ];

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1 style={{ color: "var(--text-main)", fontSize: "3.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        🤖 AI Advisor Processing
      </h1>
      <p style={{ fontSize: "1.3rem", color: "var(--text-secondary)", marginBottom: "2rem", fontStyle: "italic" }}>
        Our intelligent system is analyzing your profile and finding the perfect university matches
      </p>

      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "1.2rem", fontWeight: "600" }}>Step {currentAgent + 1} / 5</p>
        <progress value={currentAgent} max={5} style={{ width: "100%", height: "20px", borderRadius: "10px" }} />
        <p style={{ fontSize: "1.3rem", marginTop: "1rem", fontWeight: "500" }}>🔄 {agentNames[currentAgent]}...</p>
      </div>

      <div style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "1rem", textAlign: "center" }}>Processing Status</h3>
        <ul style={{ fontSize: "1.2rem", lineHeight: "2" }}>
          {agentResults.normalized_profile && <li style={{ color: "#48bb78" }}>✅ Profile Normalized</li>}
          {agentResults.matched_programs && <li style={{ color: "#48bb78" }}>✅ Universities Matched</li>}
          {agentResults.ranked_programs && <li style={{ color: "#48bb78" }}>✅ Programs Ranked</li>}
          {agentResults.scholarships && <li style={{ color: "#48bb78" }}>✅ Scholarships Found</li>}
          {agentResults.reviews && <li style={{ color: "#48bb78" }}>✅ Reviews Collected</li>}
          
          {!agentResults.normalized_profile && <li style={{ color: "#ed8936" }}>⏳ Profile Normalization</li>}
          {!agentResults.matched_programs && currentAgent > 0 && <li style={{ color: "#ed8936" }}>⏳ University Matching</li>}
          {!agentResults.ranked_programs && currentAgent > 1 && <li style={{ color: "#ed8936" }}>⏳ Program Ranking</li>}
          {!agentResults.scholarships && currentAgent > 2 && <li style={{ color: "#ed8936" }}>⏳ Scholarship Search</li>}
          {!agentResults.reviews && currentAgent > 3 && <li style={{ color: "#ed8936" }}>⏳ Review Collection</li>}
        </ul>
      </div>
    </div>
  );
}
