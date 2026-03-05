require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(express.json());

app.use(cors({
  origin: "https://student-engine-three.vercel.app"
}));


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("Student AI Engine Running 🚀");
});


// ================= STUDENTS =================

// Get all students
app.get("/students", async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT s.*, t.name AS trainer_name
      FROM students s
      LEFT JOIN trainers t ON s.trainer_id = t.id
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Database error" });
  }
});


// Get single student by name + batch
app.get("/students/:name/:batch", async (req, res) => {

  const { name, batch } = req.params;

  try {

    const result = await pool.query(
      `SELECT * FROM students
       WHERE name = $1 AND batch = $2`,
      [name, batch]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch student" });
  }
});


// ================= TRAINERS =================

app.get("/trainers", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT * FROM trainers
      ORDER BY id
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch trainers" });
  }
});


// ================= OPPORTUNITIES =================

// Get all opportunities
app.get("/opportunities", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT o.*, s.name, s.batch
      FROM opportunities o
      JOIN students s ON o.student_id = s.id
      ORDER BY o.id
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch opportunities" });
  }
});


// Get opportunities by student name + batch
app.get("/students/:name/:batch/opportunities", async (req, res) => {

  const { name, batch } = req.params;

  try {

    const result = await pool.query(`
      SELECT o.*
      FROM opportunities o
      JOIN students s ON o.student_id = s.id
      WHERE s.name = $1 AND s.batch = $2
    `, [name, batch]);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch opportunities" });
  }
});


// Assign opportunity using name + batch
app.post("/opportunities", async (req, res) => {

  const { name, batch, company, role } = req.body;

  try {

    const student = await pool.query(
      `SELECT id FROM students WHERE name=$1 AND batch=$2`,
      [name, batch]
    );

    if (!student.rows.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentId = student.rows[0].id;

    const result = await pool.query(`
      INSERT INTO opportunities (student_id, company, role)
      VALUES ($1,$2,$3)
      RETURNING *
    `,[studentId, company, role]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to create opportunity" });
  }
});


// ================= STUDENT SCORES =================

// Get all scores
app.get("/scores", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT ss.*, s.name, s.batch
      FROM student_scores ss
      JOIN students s ON ss.student_id = s.id
      ORDER BY ss.evaluated_at DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});


// Get scores by name + batch
app.get("/students/:name/:batch/scores", async (req, res) => {

  const { name, batch } = req.params;

  try {

    const result = await pool.query(`
      SELECT ss.*
      FROM student_scores ss
      JOIN students s ON ss.student_id = s.id
      WHERE s.name = $1 AND s.batch = $2
      ORDER BY ss.evaluated_at DESC
    `, [name, batch]);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});


// ================= EVALUATIONS =================

app.get("/evaluations", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT e.*, s.name, s.batch
      FROM evaluations e
      JOIN students s ON e.student_id = s.id
      ORDER BY e.created_at DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch evaluations" });
  }
});


// Get evaluations by name + batch
app.get("/students/:name/:batch/evaluations", async (req, res) => {

  const { name, batch } = req.params;

  try {

    const result = await pool.query(`
      SELECT e.*
      FROM evaluations e
      JOIN students s ON e.student_id = s.id
      WHERE s.name = $1 AND s.batch = $2
      ORDER BY e.created_at DESC
    `, [name, batch]);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch evaluations" });
  }
});


// ================= STUDENTS NEEDING OPPORTUNITY =================

app.get("/students/needs-opportunity", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT 
        s.name,
        s.batch,
        ss.readiness_score,
        ss.opportunity_probability
      FROM students s
      JOIN student_scores ss 
        ON s.id = ss.student_id
      LEFT JOIN opportunities o 
        ON s.id = o.student_id
      WHERE ss.evaluated_at = (
        SELECT MAX(evaluated_at)
        FROM student_scores
        WHERE student_id = s.id
      )
      AND ss.readiness_score >= 75
      AND o.id IS NULL
      ORDER BY ss.readiness_score DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch students needing opportunity" });
  }
});


// ================= AUTOMATION =================

app.post("/automation/mark-notified/:name/:batch", async (req, res) => {

  const { name, batch } = req.params;

  try {

    await pool.query(`
      UPDATE students
      SET last_notified_at = NOW()
      WHERE name=$1 AND batch=$2
    `, [name, batch]);

    res.json({ message: "Notification timestamp updated" });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to update notification" });
  }
});


// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});