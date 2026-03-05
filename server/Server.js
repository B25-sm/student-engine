require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(express.json());

app.use(cors({
origin: "https://student-engine-three.vercel.app"
}));

// ================= DATABASE =================

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
});

// ================= HEALTH CHECK =================

app.get("/", (req, res) => {
res.json({
status: "running",
service: "Student AI Engine 🚀"
});
});

// ================= TRAINERS =================

app.get("/trainers", async (req, res) => {

try {

```
const result = await pool.query(`
  SELECT *
  FROM trainers
  ORDER BY id
`);

res.json(result.rows);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch trainers"
});
```

}

});

// ================= STUDENTS =================

// Get all students
app.get("/students", async (req, res) => {

try {

```
const result = await pool.query(`
  SELECT
    s.*,
    t.name AS trainer_name
  FROM students s
  LEFT JOIN trainers t
  ON s.trainer_id = t.id
  ORDER BY s.id
`);

res.json(result.rows);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch students"
});
```

}

});

// ================= STUDENTS NEEDING OPPORTUNITY =================

app.get("/students/needs-opportunity", async (req, res) => {

try {

```
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
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch placement-ready students"
});
```

}

});

// ================= GET SINGLE STUDENT =================

app.get("/students/:name/:batch", async (req, res) => {

const { name, batch } = req.params;

try {

```
const result = await pool.query(`
  SELECT *
  FROM students
  WHERE name = $1
  AND batch = $2
`,[name,batch]);

if(result.rows.length === 0){

  return res.status(404).json({
    error:"Student not found"
  });

}

res.json(result.rows[0]);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch student"
});
```

}

});

// ================= OPPORTUNITIES =================

// Get all opportunities
app.get("/opportunities", async (req, res) => {

try {

```
const result = await pool.query(`
  SELECT
    o.*,
    s.name,
    s.batch
  FROM opportunities o
  JOIN students s
  ON o.student_id = s.id
  ORDER BY o.id
`);

res.json(result.rows);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch opportunities"
});
```

}

});

// Get opportunities for a student
app.get("/students/:name/:batch/opportunities", async (req, res) => {

const { name, batch } = req.params;

try {

```
const result = await pool.query(`
  SELECT o.*
  FROM opportunities o
  JOIN students s
  ON o.student_id = s.id
  WHERE s.name = $1
  AND s.batch = $2
`,[name,batch]);

res.json(result.rows);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch opportunities"
});
```

}

});

// Assign opportunity
app.post("/opportunities", async (req, res) => {

const { name, batch, company, role } = req.body;

try {

```
const student = await pool.query(`
  SELECT id
  FROM students
  WHERE name=$1
  AND batch=$2
`,[name,batch]);

if(student.rows.length === 0){

  return res.status(404).json({
    error:"Student not found"
  });

}

const studentId = student.rows[0].id;

const result = await pool.query(`
  INSERT INTO opportunities
  (student_id, company, role)
  VALUES ($1,$2,$3)
  RETURNING *
`,[studentId,company,role]);

res.json(result.rows[0]);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to assign opportunity"
});
```

}

});

// ================= STUDENT SCORES =================

// Get all scores
app.get("/scores", async (req, res) => {

try {

```
const result = await pool.query(`
  SELECT
    ss.*,
    s.name,
    s.batch
  FROM student_scores ss
  JOIN students s
  ON ss.student_id = s.id
  ORDER BY ss.evaluated_at DESC
`);

res.json(result.rows);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch scores"
});
```

}

});

// Get scores for student
app.get("/students/:name/:batch/scores", async (req, res) => {

const { name, batch } = req.params;

try {

```
const result = await pool.query(`
  SELECT ss.*
  FROM student_scores ss
  JOIN students s
  ON ss.student_id = s.id
  WHERE s.name = $1
  AND s.batch = $2
  ORDER BY ss.evaluated_at DESC
`,[name,batch]);

res.json(result.rows);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch scores"
});
```

}

});

// ================= EVALUATIONS =================

// Get all evaluations
app.get("/evaluations", async (req, res) => {

try {

```
const result = await pool.query(`
  SELECT
    e.*,
    s.name,
    s.batch
  FROM evaluations e
  JOIN students s
  ON e.student_id = s.id
  ORDER BY e.created_at DESC
`);

res.json(result.rows);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch evaluations"
});
```

}

});

// Get evaluations for student
app.get("/students/:name/:batch/evaluations", async (req, res) => {

const { name, batch } = req.params;

try {

```
const result = await pool.query(`
  SELECT e.*
  FROM evaluations e
  JOIN students s
  ON e.student_id = s.id
  WHERE s.name = $1
  AND s.batch = $2
  ORDER BY e.created_at DESC
`,[name,batch]);

res.json(result.rows);
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "Failed to fetch evaluations"
});
```

}

});

// ================= AUTOMATION =================

app.post("/automation/mark-notified/:name/:batch", async (req, res) => {

const { name, batch } = req.params;

try {

```
await pool.query(`
  UPDATE students
  SET last_notified_at = NOW()
  WHERE name=$1
  AND batch=$2
`,[name,batch]);

res.json({
  message:"Notification timestamp updated"
});
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error:"Failed to update notification"
});
```

}

});

// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

console.log("Server running on port " + PORT);

});
