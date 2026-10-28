
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. CONSTANTS
// ============================================

const LIMITS = Object.freeze({
  NAME_MIN: 2,
  NAME_MAX: 80,
  COURSE_MIN: 2,
  COURSE_MAX: 100,
  AGE_MIN: 16,
  AGE_MAX: 100
});

const ALLOWED_FIELDS = Object.freeze(["name", "course", "age"]);

// ============================================
// 2. DATA / SERVICE
// ============================================

// Encapsulated in-memory repository.
// Replace this module's storage with a database for persistence.
const studentRepository = (() => {
  let students = [
    { id: 1, name: "Rahul Sharma", course: "Node.js", age: 21 },
    { id: 2, name: "Priya Patil", course: "Express.js", age: 22 },
    { id: 3, name: "Amit Deshmukh", course: "JavaScript", age: 20 }
  ];

  let nextId = 4;

  return {
    getAll() {
      return students.map(student => ({ ...student }));
    },

    getById(id) {
      const student = students.find(item => item.id === id);
      return student ? { ...student } : null;
    },

    create(data) {
      const student = {
        id: nextId++,
        name: data.name.trim(),
        course: data.course.trim(),
        age: data.age
      };

      students.push(student);
      return { ...student };
    },

    replace(id, data) {
      const index = students.findIndex(item => item.id === id);
      if (index === -1) return null;

      const student = {
        id,
        name: data.name.trim(),
        course: data.course.trim(),
        age: data.age
      };

      students[index] = student;
      return { ...student };
    },

    update(id, updates) {
      const index = students.findIndex(item => item.id === id);
      if (index === -1) return null;

      const current = students[index];
      const student = {
        ...current,
        ...updates,
        name: updates.name === undefined
          ? current.name
          : updates.name.trim(),
        course: updates.course === undefined
          ? current.course
          : updates.course.trim()
      };

      students[index] = student;
      return { ...student };
    },

    remove(id) {
      const index = students.findIndex(item => item.id === id);
      if (index === -1) return null;

      return { ...students.splice(index, 1)[0] };
    }
  };
})();

// ============================================
// 3. MIDDLEWARE
// ============================================

app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );
  next();
});

// ============================================
// 4. SHARED VALIDATION HELPERS
// ============================================

function parseStudentId(req, res, next) {
  const rawId = req.params.id;

  // Reject decimals, zero, negatives, signs, and non-numeric IDs.
  if (!/^[1-9]\d*$/.test(rawId)) {
    return res.status(400).json({
      success: false,
      message: "Student ID must be a positive integer."
    });
  }

  const id = Number(rawId);

  if (!Number.isSafeInteger(id)) {
    return res.status(400).json({
      success: false,
      message: "Student ID is outside the supported range."
    });
  }

  req.studentId = id;
  next();
}

function validateField(field, value) {
  switch (field) {
    case "name":
      return (
        typeof value === "string" &&
        value.trim().length >= LIMITS.NAME_MIN &&
        value.trim().length <= LIMITS.NAME_MAX
      );

    case "course":
      return (
        typeof value === "string" &&
        value.trim().length >= LIMITS.COURSE_MIN &&
        value.trim().length <= LIMITS.COURSE_MAX
      );

    case "age":
      return (
        Number.isInteger(value) &&
        value >= LIMITS.AGE_MIN &&
        value <= LIMITS.AGE_MAX
      );

    default:
      return false;
  }
}

function validateStudent(data, partial = false) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return {
      valid: false,
      message: "Request body must be a JSON object."
    };
  }

  const fields = Object.keys(data);

  if (partial && fields.length === 0) {
    return {
      valid: false,
      message: "Provide at least one field to update."
    };
  }

  const invalidFields = fields.filter(
    field => !ALLOWED_FIELDS.includes(field)
  );

  if (invalidFields.length > 0) {
    return {
      valid: false,
      message: "Unsupported field(s) provided.",
      fields: invalidFields
    };
  }

  if (!partial) {
    const requiredFields = ["name", "course", "age"];
    const missingFields = requiredFields.filter(
      field => !Object.prototype.hasOwnProperty.call(data, field)
    );

    if (missingFields.length > 0) {
      return {
        valid: false,
        message: "Name, course, and age are required.",
        fields: missingFields
      };
    }
  }

  for (const field of fields) {
    if (!validateField(field, data[field])) {
      const messages = {
        name: "Name must be between 2 and 80 characters.",
        course: "Course must be between 2 and 100 characters.",
        age: "Age must be an integer between 16 and 100."
      };

      return {
        valid: false,
        message: messages[field]
      };
    }
  }

  return { valid: true };
}

function sendValidationError(res, result) {
  const response = {
    success: false,
    message: result.message
  };

  if (result.fields) {
    response.fields = result.fields;
  }

  return res.status(400).json(response);
}

// ============================================
// 5. HOME ROUTE
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
// 6. GET ALL STUDENTS
// ============================================

app.get("/api/students", (req, res) => {
  const students = studentRepository.getAll();

  res.status(200).json({
    success: true,
    count: students.length,
    data: students
  });
});

// ============================================
// 7. GET STUDENT BY ID
// ============================================

app.get("/api/students/:id", parseStudentId, (req, res) => {
  const student = studentRepository.getById(req.studentId);

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
// 8. CREATE STUDENT
// ============================================

app.post("/api/students", (req, res) => {
  const validation = validateStudent(req.body);

  if (!validation.valid) {
    return sendValidationError(res, validation);
  }

  const student = studentRepository.create(req.body);

  res.status(201).json({
    success: true,
    message: "Student created successfully.",
    data: student
  });
});

// ============================================
// 9. REPLACE STUDENT - PUT
// ============================================

app.put("/api/students/:id", parseStudentId, (req, res) => {
  const validation = validateStudent(req.body);

  if (!validation.valid) {
    return sendValidationError(res, validation);
  }

  const student = studentRepository.replace(
    req.studentId,
    req.body
  );

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found."
    });
  }

  res.status(200).json({
    success: true,
    message: "Student replaced successfully.",
    data: student
  });
});

// ============================================
// 10. PARTIALLY UPDATE STUDENT - PATCH
// ============================================

app.patch("/api/students/:id", parseStudentId, (req, res) => {
  const validation = validateStudent(req.body, true);

  if (!validation.valid) {
    return sendValidationError(res, validation);
  }

  const student = studentRepository.update(
    req.studentId,
    req.body
  );

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found."
    });
  }

  res.status(200).json({
    success: true,
    message: "Student updated successfully.",
    data: student
  });
});

// ============================================
// 11. DELETE STUDENT
// ============================================

app.delete("/api/students/:id", parseStudentId, (req, res) => {
  const student = studentRepository.remove(req.studentId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found."
    });
  }

  res.status(200).json({
    success: true,
    message: "Student deleted successfully.",
    data: student
  });
});

// ============================================
// 12. HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// ============================================
// 13. 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found."
  });
});

// ============================================
// 14. CENTRAL ERROR HANDLER
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
// 15. START SERVER
// ============================================

if (require.main === module) {
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
}

module.exports = app;
