require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("Student AI Engine Running 🚀");
});

// ================= GET STUDENTS =================
app.get("/students", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, t.name AS trainer_name
      FROM students s
      JOIN trainers t ON s.trainer_id = t.id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Database error" });
  }
});


// ================= UPDATE STUDENT SCORES (NEW) =================
app.put("/students/:studentId", async (req, res) => {
  const { studentId } = req.params;
  const data = req.body;

  try {
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: "No data provided" });
    }

    const fields = Object.keys(data);
    const values = Object.values(data);

    const setQuery = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");

    await pool.query(
      `UPDATE students 
       SET ${setQuery}, updated_at = NOW() 
       WHERE id = $${fields.length + 1}`,
      [...values, studentId]
    );

    res.json({ message: "Student updated successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Update failed" });
  }
});


// ================= EVALUATE =================
app.post("/evaluate/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const studentResult = await pool.query(
      "SELECT * FROM students WHERE id = $1",
      [studentId]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    const s = studentResult.rows[0];

    const technical = Number(s.technical_communication) || 0;
    const hr = Number(s.hr_communication) || 0;
    const problem = Number(s.problem_solving) || 0;
    const creative = Number(s.creative_thinking) || 0;
    const intent = Number(s.intent_to_learn) || 0;
    const frontend = Number(s.frontend) || 0;
    const backend = Number(s.backend) || 0;
    const projects = Number(s.projects_done) || 0;

    const readinessScore = Math.floor(
      technical * 0.15 +
      hr * 0.15 +
      problem * 0.15 +
      creative * 0.05 +
      intent * 0.05 +
      frontend * 0.15 +
      backend * 0.15 +
      (projects * 5) * 0.15
    );

    const riskScore = 100 - readinessScore;

    const opportunityProbability = Math.floor(
      (frontend + backend + problem + readinessScore) / 4
    );

    const skills = {
      technical_communication: technical,
      hr_communication: hr,
      problem_solving: problem,
      creative_thinking: creative,
      intent_to_learn: intent,
      frontend: frontend,
      backend: backend
    };

    const weakestSkill = Object.entries(skills).reduce((min, current) =>
      current[1] < min[1] ? current : min
    )[0];

    const formattedSkill = weakestSkill.replace(/_/g, " ");

    let aiReason = "";

    if (readinessScore >= 80) {
      aiReason = "Excellent readiness. Strong placement potential.";
    } else if (readinessScore >= 65) {
      aiReason = `Moderate readiness. Improve ${formattedSkill}.`;
    } else {
      aiReason = `High risk. Immediate improvement needed in ${formattedSkill}.`;
    }

    await pool.query(`
      INSERT INTO student_scores 
      (student_id, readiness_score, risk_score, opportunity_probability, ai_reason)
      VALUES ($1, $2, $3, $4, $5)
    `, [studentId, readinessScore, riskScore, opportunityProbability, aiReason]);

    res.json({
      studentId,
      readinessScore,
      riskScore,
      opportunityProbability,
      aiReason
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Evaluation failed" });
  }
});


// ================= READINESS TREND =================
app.get("/analytics/readiness-trend/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const result = await pool.query(`
      SELECT readiness_score
      FROM student_scores
      WHERE student_id = $1
      ORDER BY evaluated_at DESC
      LIMIT 2
    `, [studentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No evaluations found" });
    }

    if (result.rows.length === 1) {
      return res.json({
        trend: "NEW",
        message: "Only one evaluation exists"
      });
    }

    const latest = result.rows[0].readiness_score;
    const previous = result.rows[1].readiness_score;

    let trend = "STABLE";
    let percentageChange = 0;

    if (previous > 0) {
      percentageChange = ((latest - previous) / previous) * 100;

      if (percentageChange > 100) percentageChange = 100;
      if (percentageChange < -100) percentageChange = -100;

      percentageChange = percentageChange.toFixed(2);

      if (latest > previous) trend = "IMPROVING";
      else if (latest < previous) trend = "DECLINING";
    }

    res.json({
      latestScore: latest,
      previousScore: previous,
      trend,
      percentageChange: Number(percentageChange)
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Trend calculation failed" });
  }
});


// ================= SMART AUTOMATION ENGINE =================
app.get("/automation/students-no-opportunity", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.name,
        ss.readiness_score,
        MAX(o.date) AS last_opportunity_date,
        EXTRACT(DAY FROM (NOW() - MAX(o.date))) AS days_since_last_opportunity,
        CASE
          WHEN ss.readiness_score >= 80 THEN 'HIGH'
          WHEN ss.readiness_score >= 65 THEN 'MEDIUM'
          ELSE 'LOW'
        END AS priority
      FROM students s
      LEFT JOIN opportunities o ON s.id = o.student_id
      LEFT JOIN student_scores ss ON s.id = ss.student_id
      WHERE ss.evaluated_at = (
        SELECT MAX(evaluated_at)
        FROM student_scores
        WHERE student_id = s.id
      )
      GROUP BY s.id, s.name, ss.readiness_score, s.last_notified_at
      HAVING
        (
          MAX(o.date) IS NULL
          OR MAX(o.date) < NOW() - INTERVAL '5 days'
        )
        AND (
          s.last_notified_at IS NULL
          OR s.last_notified_at < NOW() - INTERVAL '5 days'
        )
      ORDER BY 
        CASE
          WHEN ss.readiness_score >= 80 THEN 1
          WHEN ss.readiness_score >= 65 THEN 2
          ELSE 3
        END,
        ss.readiness_score DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Automation check failed" });
  }
});


// ================= MARK NOTIFIED =================
app.post("/automation/mark-notified/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    await pool.query(`
      UPDATE students
      SET last_notified_at = NOW()
      WHERE id = $1
    `, [studentId]);

    res.json({ message: "Notification timestamp updated" });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to update notification" });
  }
});


// ================= START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
