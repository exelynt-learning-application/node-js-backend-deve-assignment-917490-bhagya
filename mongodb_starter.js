
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/mongodb_starter";

// ============================================
// 1. CONFIGURATION
// ============================================

app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );
  next();
});

// ============================================
// 2. MONGOOSE MODEL
// ============================================

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required."],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters."],
      maxlength: [100, "Name cannot exceed 100 characters."]
    },
    email: {
      type: String,
      required: [true, "Student email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address."
      ]
    },
    course: {
      type: String,
      required: [true, "Course is required."],
      trim: true,
      minlength: [2, "Course must contain at least 2 characters."],
      maxlength: [100, "Course cannot exceed 100 characters."]
    },
    age: {
      type: Number,
      required: [true, "Student age is required."],
      min: [16, "Age must be at least 16."],
      max: [100, "Age cannot exceed 100."],
      validate: {
        validator: Number.isInteger,
        message: "Age must be an integer."
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Student = mongoose.model("Student", studentSchema);

// ============================================
// 3. ASYNC ERROR HANDLER
// ============================================

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================
// 4. HOME ROUTE / DOCUMENTATION
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the MongoDB Starter API",
    database: "MongoDB with Mongoose",
    endpoints: {
      health: "GET /health",
      getAllStudents: "GET /api/students",
      getStudentById: "GET /api/students/:id",
      createStudent: "POST /api/students",
      updateStudent: "PUT /api/students/:id",
      partiallyUpdateStudent: "PATCH /api/students/:id",
      deleteStudent: "DELETE /api/students/:id"
    }
  });
});

// ============================================
// 5. HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    status: connected ? "OK" : "Database unavailable",
    database: connected ? "connected" : "disconnected"
  });
});

// ============================================
// 6. VALIDATE MONGODB OBJECT ID
// ============================================

function validateObjectId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID format."
    });
  }

  next();
}

// ============================================
// 7. GET ALL STUDENTS
// GET /api/students
// ============================================

app.get(
  "/api/students",
  asyncHandler(async (req, res) => {
    const students = await Student.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  })
);

// ============================================
// 8. GET STUDENT BY ID
// GET /api/students/:id
// ============================================

app.get(
  "/api/students/:id",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);

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
  })
);

// ============================================
// 9. CREATE STUDENT
// POST /api/students
// ============================================

app.post(
  "/api/students",
  asyncHandler(async (req, res) => {
    const { name, email, course, age } = req.body || {};

    const student = await Student.create({
      name,
      email,
      course,
      age
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully.",
      data: student
    });
  })
);

// ============================================
// 10. REPLACE STUDENT
// PUT /api/students/:id
// ============================================

app.put(
  "/api/students/:id",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { name, email, course, age } = req.body || {};

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, email, course, age },
      {
        new: true,
        runValidators: true,
        overwrite: true
      }
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
  })
);

// ============================================
// 11. PARTIALLY UPDATE STUDENT
// PATCH /api/students/:id
// ============================================

app.patch(
  "/api/students/:id",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const allowedFields = ["name", "email", "course", "age"];
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

    const invalidFields = Object.keys(updates).filter(
      field => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Unsupported field(s) provided.",
        fields: invalidFields
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
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
  })
);

// ============================================
// 12. DELETE STUDENT
// DELETE /api/students/:id
// ============================================

app.delete(
  "/api/students/:id",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const student = await Student.findByIdAndDelete(req.params.id);

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
  })
);

// ============================================
// 13. UNKNOWN ROUTE HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found."
  });
});

// ============================================
// 14. CENTRALIZED ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error("API error:", err.message);

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

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(err.errors).map(error => error.message)
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid value provided."
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A student with this email already exists."
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// ============================================
// 15. CONNECT DATABASE AND START SERVER
// ============================================

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected successfully.");

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    function shutdown() {
      console.log("Shutting down server...");

      server.close(async error => {
        if (error) {
          console.error("Server shutdown failed:", error);
          process.exitCode = 1;
        }

        try {
          await mongoose.disconnect();
          console.log("MongoDB disconnected.");
        } catch (disconnectError) {
          console.error("Database shutdown failed:", disconnectError);
          process.exitCode = 1;
        }
      });
    }

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start application:", error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
