
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. MIDDLEWARE
// ============================================

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.url}`
  );
  next();
});

// ============================================
// 2. DATA
// ============================================

// Sample data stored in memory
let students = [
  { id: 1, name: "Rahul Sharma", course: "Node.js", age: 21 },
  { id: 2, name: "Priya Patil", course: "Express.js", age: 22 },
  { id: 3, name: "Amit Deshmukh", course: "JavaScript", age: 20 }
];

let nextId = 4;

// ============================================
// 3. ROUTES - HOME
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the REST Server Setup API",
    endpoints: {
      getAllStudents: "GET /api/students",
      getStudentById: "GET /api/students/:id",
      createStudent: "POST /api/students",
      updateStudent: "PUT /api/students/:id",
      partiallyUpdateStudent: "PATCH /api/students/:id",
      deleteStudent: "DELETE /api/students/:id",
      healthCheck: "GET /health"
    }
  });
});

// ============================================
// 4. GET ALL STUDENTS
// ============================================

app.get("/api/students", (req, res) => {
  res.status(200).json({
    success: true,
    count: students.length,
    data: students
  });
});

// ============================================
// 5. GET STUDENT BY ID
// ============================================

app.get("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Student ID must be a positive integer."
    });
  }

  const student = students.find(item => item.id === id);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found."
    });
  }

  res.status(200).json({
    success: true,
    data: student
  });
});

// ============================================
// 6. CREATE A STUDENT
// ============================================

app.post("/api/students", (req, res) => {
  const { name, course, age } = req.body || {};

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80
  ) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 2 and 80 characters."
    });
  }

  if (
    typeof course !== "string" ||
    course.trim().length < 2 ||
    course.trim().length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Course must be between 2 and 100 characters."
    });
  }

  if (!Number.isInteger(age) || age < 16 || age > 100) {
    return res.status(400).json({
      success: false,
      message: "Age must be an integer between 16 and 100."
    });
  }

  const newStudent = {
    id: nextId++,
    name: name.trim(),
    course: course.trim(),
    age
  };

  students.push(newStudent);

  res.status(201).json({
    success: true,
    message: "Student created successfully.",
    data: newStudent
  });
});

// ============================================
// 7. UPDATE A STUDENT - PUT
// ============================================

app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Student ID must be a positive integer."
    });
  }

  const index = students.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Student not found."
    });
  }

  const { name, course, age } = req.body || {};

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80 ||
    typeof course !== "string" ||
    course.trim().length < 2 ||
    course.trim().length > 100 ||
    !Number.isInteger(age) ||
    age < 16 ||
    age > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid name, course, and age to replace the student."
    });
  }

  students[index] = {
    id,
    name: name.trim(),
    course: course.trim(),
    age
  };

  res.status(200).json({
    success: true,
    message: "Student replaced successfully.",
    data: students[index]
  });
});

// ============================================
// 8. PARTIALLY UPDATE A STUDENT - PATCH
// ============================================

app.patch("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Student ID must be a positive integer."
    });
  }

  const student = students.find(item => item.id === id);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found."
    });
  }

  const updates = req.body;

  if (
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates) ||
    Object.keys(updates).length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one field to update."
    });
  }

  const allowedFields = ["name", "course", "age"];
  const invalidFields = Object.keys(updates).filter(
    key => !allowedFields.includes(key)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Unsupported field(s) provided.",
      fields: invalidFields
    });
  }

  if (
    "name" in updates &&
    (typeof updates.name !== "string" ||
      updates.name.trim().length < 2 ||
      updates.name.trim().length > 80)
  ) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 2 and 80 characters."
    });
  }

  if (
    "course" in updates &&
    (typeof updates.course !== "string" ||
      updates.course.trim().length < 2 ||
      updates.course.trim().length > 100)
  ) {
    return res.status(400).json({
      success: false,
      message: "Course must be between 2 and 100 characters."
    });
  }

  if (
    "age" in updates &&
    (!Number.isInteger(updates.age) ||
      updates.age < 16 ||
      updates.age > 100)
  ) {
    return res.status(400).json({
      success: false,
      message: "Age must be an integer between 16 and 100."
    });
  }

  if ("name" in updates) student.name = updates.name.trim();
  if ("course" in updates) student.course = updates.course.trim();
  if ("age" in updates) student.age = updates.age;

  res.status(200).json({
    success: true,
    message: "Student updated successfully.",
    data: student
  });
});

// ============================================
// 9. DELETE A STUDENT
// ============================================

app.delete("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Student ID must be a positive integer."
    });
  }

  const index = students.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Student not found."
    });
  }

  const deletedStudent = students.splice(index, 1)[0];

  res.status(200).json({
    success: true,
    message: "Student deleted successfully.",
    data: deletedStudent
  });
});

// ============================================
// 10. HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// ============================================
// 11. 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found."
  });
});

// ============================================
// 12. ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body."
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large."
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// ============================================
// 13. START SERVER
// ============================================

const server = app.listen(PORT, () => {
  console.log(`REST API running at http://localhost:${PORT}`);
});

function shutdown() {
  console.log("Shutting down server...");

  server.close(error => {
    if (error) {
      console.error("Shutdown failed:", error);
      process.exitCode = 1;
    } else {
      console.log("Server closed successfully.");
    }
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
