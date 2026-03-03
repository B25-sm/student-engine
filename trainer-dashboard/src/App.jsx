import { useState } from "react";
import axios from "axios";

// ✅ Production API URL from .env
const API_URL = import.meta.env.VITE_API_URL;

const skills = [
  { key: "technical_communication", label: "Technical Communication" },
  { key: "hr_communication", label: "HR Communication" },
  { key: "problem_solving", label: "Problem Solving" },
  { key: "creative_thinking", label: "Creative Thinking" },
  { key: "intent_to_learn", label: "Intent To Learn" },
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" }
];

const scoreOptions = [
  { value: 100, label: "100 - Exceptional performance, industry ready" },
  { value: 90, label: "90 - Very confident, strong clarity" },
  { value: 80, label: "80 - Good understanding with minor gaps" },
  { value: 70, label: "70 - Can explain but lacks depth" },
  { value: 60, label: "60 - Average understanding" },
  { value: 50, label: "50 - Basic knowledge, needs improvement" },
  { value: 40, label: "40 - Struggles to explain concepts" },
  { value: 30, label: "30 - Very limited clarity" },
  { value: 20, label: "20 - Minimal understanding" },
  { value: 10, label: "10 - Cannot explain properly" }
];

export default function App() {
  const [studentId, setStudentId] = useState("");
  const [formData, setFormData] = useState({});
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: Number(value)
    }));
  };

  const handleSubmit = async () => {
    if (!studentId) {
      alert("Please enter Student ID");
      return;
    }

    if (Object.keys(formData).length !== skills.length) {
      alert("Please select ALL performance levels before submitting.");
      return;
    }

    try {
      setLoading(true);

      // ✅ Update student scores
      await axios.put(
        `${API_URL}/students/${studentId}`,
        formData
      );

      // ✅ Run evaluation
      const result = await axios.post(
        `${API_URL}/evaluate/${studentId}`
      );

      setResponse(result.data);

    } catch (error) {
      console.error("Server Error:", error.response?.data || error.message);
      alert(
        error.response?.data?.error ||
        "Error submitting evaluation"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Trainer Evaluation Dashboard</h1>

      <div style={{ marginBottom: 20 }}>
        <label>Student ID: </label>
        <input
          type="number"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      </div>

      {skills.map((skill) => (
        <div key={skill.key} style={{ marginBottom: 15 }}>
          <label>{skill.label}</label>
          <br />
          <select
            onChange={(e) => handleChange(skill.key, e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Select Performance Level
            </option>
            {scoreOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        style={{ marginTop: 20 }}
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit Evaluation"}
      </button>

      {response && (
        <div style={{ marginTop: 30 }}>
          <h2>Evaluation Result</h2>
          <p><strong>Readiness Score:</strong> {response.readinessScore}</p>
          <p><strong>Risk Score:</strong> {response.riskScore}</p>
          <p><strong>Opportunity Probability:</strong> {response.opportunityProbability}</p>
          <p><strong>AI Reason:</strong> {response.aiReason}</p>
        </div>
      )}
    </div>
  );
}
