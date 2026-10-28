
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/student_management";

app.use(express.json({ limit: "100kb" }));

// ============================================
// 1. DATABASE MODELS
// ============================================

// DEPARTMENT MODEL
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required."],
      unique: true,
      trim: true,
      minlength: [2, "Department name must contain at least 2 characters."],
      maxlength: [100, "Department name cannot exceed 100 characters."]
    },
    code: {
      type: String,
      required: [true, "Department code is required."],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{2,10}$/, "Department code must be 2-10 characters."]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters."],
      default: ""
    }
  },
  { timestamps: true, versionKey: false }
);

const Department = mongoose.model("Department", departmentSchema);

// COURSE MODEL
const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Course name is required."],
      trim: true,
      minlength: [2, "Course name must contain at least 2 characters."],
      maxlength: [100, "Course name cannot exceed 100 characters."]
    },
    code: {
      type: String,
      required: [true, "Course code is required."],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{2,15}$/, "Course code must be 2-15 characters."]
    },
    credits: {
      type: Number,
      required: [true, "Course credits are required."],
      min: [1, "Credits must be at least 1."],
      max: [30, "Credits cannot exceed 30."],
      validate: {
        validator: Number.isInteger,
        message: "Credits must be an integer."
      }
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Every course must belong to a department."]
    }
  },
  { timestamps: true, versionKey: false }
);

const Course = mongoose.model("Course", courseSchema);

// STUDENT MODEL
const studentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required."],
      trim: true,
      minlength: [2, "First name must contain at least 2 characters."],
      maxlength: [50, "First name cannot exceed 50 characters."]
    },
    lastName: {
      type: String,
      required: [true, "Last name is required."],
      trim: true,
      minlength: [2, "Last name must contain at least 2 characters."],
      maxlength: [50, "Last name cannot exceed 50 characters."]
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Enter a valid email address."
      ]
    },
    age: {
      type: Number,
      required: [true, "Age is required."],
      min: [16, "Student must be at least 16 years old."],
      max: [100, "Age cannot exceed 100."],
      validate: {
        validator: Number.isInteger,
        message: "Age must be an integer."
      }
    },
    studentId: {
      type: String,
      required: [true, "Student ID is required."],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{3,20}$/, "Student ID must be 3-20 characters."]
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Student department is required."]
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
      }
    ],
    enrollmentDate: {
      type: Date,
      default: Date.now,
      validate: {
        validator: value => value <= new Date(),
        message: "Enrollment date cannot be in the future."
      }
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive", "Graduated"],
        message: "Status must be Active, Inactive, or Graduated."
      },
      default: "Active"
    }
  },
  { timestamps: true, versionKey: false }
);

const Student = mongoose.model("Student", studentSchema);

// ============================================
// 2. HELPER FUNCTIONS
// ============================================

function isValidId(id) {
  return mongoose.isObjectIdOrHexString(id);
}

async function referencesExist(Model, ids) {
  const uniqueIds = [...new Set(ids.map(id => String(id)))];

  const documents = await Model.find({
    _id: { $in: uniqueIds }
  }).select("_id");

  return documents.length === uniqueIds.length;
}

// ============================================
// 3. HOME AND HEALTH ROUTES
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Student Management Database System API",
    endpoints: {
      departments: "/api/departments",
      departmentById: "/api/departments/:id",
      courses: "/api/courses",
      courseById: "/api/courses/:id",
      students: "/api/students",
      studentById: "/api/students/:id",
      enrollStudent: "POST /api/students/:id/courses/:courseId",
      removeEnrollment: "DELETE /api/students/:id/courses/:courseId",
      health: "/health"
    }
  });
});

app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    database: connected ? "Connected" : "Disconnected"
  });
});

// ============================================
// 4. DEPARTMENT ROUTES
// ============================================

// Create department
app.post("/api/departments", async (req, res, next) => {
  try {
    const department = await Department.create(req.body);

    res.status(201).json({
      success: true,
      message: "Department created successfully.",
      data: department
    });
  } catch (error) {
    next(error);
  }
});

// Get all departments
app.get("/api/departments", async (req, res, next) => {
  try {
    const departments = await Department.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    next(error);
  }
});

// Get department by ID
app.get("/api/departments/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID."
      });
    }

    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found."
      });
    }

    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
});

// Update department
app.put("/api/departments/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID."
      });
    }

    const allowedFields = ["name", "code", "description"];
    const invalidFields = Object.keys(req.body || {}).filter(
      key => !allowedFields.includes(key)
    );

    if (invalidFields.length) {
      return res.status(400).json({
        success: false,
        message: "Unsupported fields.",
        fields: invalidFields
      });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: department
    });
  } catch (error) {
    next(error);
  }
});

// Delete department only if no courses or students reference it
app.delete("/api/departments/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID."
      });
    }

    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found."
      });
    }

    const [courseExists, studentExists] = await Promise.all([
      Course.exists({ department: department._id }),
      Student.exists({ department: department._id })
    ]);

    if (courseExists || studentExists) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete a department that has courses or students."
      });
    }

    await department.deleteOne();

    res.status(200).json({
      success: true,
      message: "Department deleted successfully."
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 5. COURSE ROUTES
// ============================================

// Create course
app.post("/api/courses", async (req, res, next) => {
  try {
    const { department } = req.body;

    if (!isValidId(department)) {
      return res.status(400).json({
        success: false,
        message: "A valid department ID is required."
      });
    }

    const departmentExists = await Department.exists({
      _id: department
    });

    if (!departmentExists) {
      return res.status(400).json({
        success: false,
        message: "The specified department does not exist."
      });
    }

    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: course
    });
  } catch (error) {
    next(error);
  }
});

// Get all courses with department details
app.get("/api/courses", async (req, res, next) => {
  try {
    const courses = await Course.find()
      .populate("department", "name code")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
});

// Get one course
app.get("/api/courses/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID."
      });
    }

    const course = await Course.findById(req.params.id)
      .populate("department", "name code description");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found."
      });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

// Update course
app.put("/api/courses/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID."
      });
    }

    const allowedFields = ["name", "code", "credits", "department"];
    const updates = req.body || {};
    const invalidFields = Object.keys(updates).filter(
      key => !allowedFields.includes(key)
    );

    if (invalidFields.length) {
      return res.status(400).json({
        success: false,
        message: "Unsupported fields.",
        fields: invalidFields
      });
    }

    if (updates.department !== undefined) {
      if (!isValidId(updates.department)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID."
        });
      }

      const exists = await Department.exists({
        _id: updates.department
      });

      if (!exists) {
        return res.status(400).json({
          success: false,
          message: "The specified department does not exist."
        });
      }
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: course
    });
  } catch (error) {
    next(error);
  }
});

// Delete course only if no student is enrolled in it
app.delete("/api/courses/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID."
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found."
      });
    }

    const enrolledStudent = await Student.exists({
      courses: course._id
    });

    if (enrolledStudent) {
      return res.status(409).json({
        success: false,
        message: "Remove student enrollments before deleting this course."
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: "Course deleted successfully."
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 6. STUDENT ROUTES
// ============================================

// Create student
app.post("/api/students", async (req, res, next) => {
  try {
    const { department, courses = [] } = req.body;

    if (!isValidId(department)) {
      return res.status(400).json({
        success: false,
        message: "A valid department ID is required."
      });
    }

    if (!Array.isArray(courses)) {
      return res.status(400).json({
        success: false,
        message: "Courses must be an array of course IDs."
      });
    }

    if (courses.some(id => !isValidId(id))) {
      return res.status(400).json({
        success: false,
        message: "Every course must have a valid ID."
      });
    }

    if (new Set(courses.map(String)).size !== courses.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate course IDs are not allowed."
      });
    }

    const departmentExists = await Department.exists({
      _id: department
    });

    if (!departmentExists) {
      return res.status(400).json({
        success: false,
        message: "The specified department does not exist."
      });
    }

    if (courses.length > 0) {
      const coursesExist = await referencesExist(Course, courses);

      if (!coursesExist) {
        return res.status(400).json({
          success: false,
          message: "One or more specified courses do not exist."
        });
      }

      const departmentCourses = await Course.countDocuments({
        _id: { $in: courses },
        department
      });

      if (departmentCourses !== new Set(courses.map(String)).size) {
        return res.status(400).json({
          success: false,
          message: "All student courses must belong to their department."
        });
      }
    }

    const student = await Student.create(req.body);

    res.status(201).json({
      success: true,
      message: "Student created successfully.",
      data: student
    });
  } catch (error) {
    next(error);
  }
});

// Get all students
app.get("/api/students", async (req, res, next) => {
  try {
    const students = await Student.find()
      .populate("department", "name code")
      .populate("courses", "name code credits")
      .sort({ lastName: 1, firstName: 1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    next(error);
  }
});

// Get student by ID
app.get("/api/students/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID."
      });
    }

    const student = await Student.findById(req.params.id)
      .populate("department", "name code description")
      .populate("courses", "name code credits");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
});

// Update student
app.put("/api/students/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID."
      });
    }

    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "age",
      "studentId",
      "department",
      "courses",
      "enrollmentDate",
      "status"
    ];

    const updates = req.body || {};
    const invalidFields = Object.keys(updates).filter(
      key => !allowedFields.includes(key)
    );

    if (invalidFields.length) {
      return res.status(400).json({
        success: false,
        message: "Unsupported fields.",
        fields: invalidFields
      });
    }

    if (updates.department !== undefined) {
      if (!isValidId(updates.department)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID."
        });
      }

      const exists = await Department.exists({
        _id: updates.department
      });

      if (!exists) {
        return res.status(400).json({
          success: false,
          message: "The specified department does not exist."
        });
      }
    }

    if (updates.courses !== undefined) {
      if (
        !Array.isArray(updates.courses) ||
        updates.courses.some(id => !isValidId(id))
      ) {
        return res.status(400).json({
          success: false,
          message: "Courses must be an array of valid course IDs."
        });
      }

      if (
        new Set(updates.courses.map(String)).size !== updates.courses.length
      ) {
        return res.status(400).json({
          success: false,
          message: "Duplicate course IDs are not allowed."
        });
      }

      const coursesExist = await referencesExist(Course, updates.courses);

      if (!coursesExist) {
        return res.status(400).json({
          success: false,
          message: "One or more courses do not exist."
        });
      }
    }

    const currentStudent = await Student.findById(req.params.id);

    if (!currentStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    const targetDepartment =
      updates.department || currentStudent.department;

    const targetCourses =
      updates.courses !== undefined
        ? updates.courses
        : currentStudent.courses;

    if (targetCourses.length > 0) {
      const departmentCourses = await Course.countDocuments({
        _id: { $in: targetCourses },
        department: targetDepartment
      });

      if (
        departmentCourses !==
        new Set(targetCourses.map(id => String(id))).size
      ) {
        return res.status(400).json({
          success: false,
          message: "All student courses must belong to their department."
        });
      }
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("department", "name code")
      .populate("courses", "name code credits");

    res.status(200).json({
      success: true,
      message: "Student updated successfully.",
      data: student
    });
  } catch (error) {
    next(error);
  }
});

// Delete student
app.delete("/api/students/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID."
      });
    }

    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "Student deleted successfully."
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 7. STUDENT COURSE ENROLLMENT
// ============================================

// Enroll a student in a course
app.post(
  "/api/students/:id/courses/:courseId",
  async (req, res, next) => {
    try {
      const { id, courseId } = req.params;

      if (!isValidId(id) || !isValidId(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID or course ID."
        });
      }

      const [student, course] = await Promise.all([
        Student.findById(id),
        Course.findById(courseId)
      ]);

      if (!student || !course) {
        return res.status(404).json({
          success: false,
          message: "Student or course not found."
        });
      }

      if (!student.department.equals(course.department)) {
        return res.status(400).json({
          success: false,
          message: "Student and course must belong to the same department."
        });
      }

      if (student.courses.some(item => item.equals(course._id))) {
        return res.status(409).json({
          success: false,
          message: "Student is already enrolled in this course."
        });
      }

      student.courses.push(course._id);
      await student.save();

      res.status(200).json({
        success: true,
        message: "Student enrolled successfully.",
        data: student
      });
    } catch (error) {
      next(error);
    }
  }
);

// Remove a student from a course
app.delete(
  "/api/students/:id/courses/:courseId",
  async (req, res, next) => {
    try {
      const { id, courseId } = req.params;

      if (!isValidId(id) || !isValidId(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID or course ID."
        });
      }

      const student = await Student.findById(id);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found."
        });
      }

      const courseIndex = student.courses.findIndex(
        item => item.equals(courseId)
      );

      if (courseIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Student is not enrolled in this course."
        });
      }

      student.courses.splice(courseIndex, 1);
      await student.save();

      res.status(200).json({
        success: true,
        message: "Student removed from course successfully.",
        data: student
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// 8. UNKNOWN ROUTE HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

// ============================================
// 9. CENTRALIZED ERROR HANDLING
// ============================================

app.use((error, req, res, next) => {
  console.error("Application error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body."
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large."
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(error.errors).map(item => item.message)
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid field value or ID."
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with this unique value already exists."
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// ============================================
// 10. CONNECT TO MONGODB AND START SERVER
// ============================================

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully.");

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    async function shutdown() {
      console.log("Shutting down application...");

      server.close(async error => {
        if (error) {
          console.error("Server shutdown error:", error.message);
          process.exitCode = 1;
        }

        try {
          await mongoose.disconnect();
          console.log("MongoDB disconnected.");
        } catch (disconnectError) {
          console.error("Database shutdown error:", disconnectError.message);
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

module.exports = {
  app,
  Department,
  Course,
  Student,
  startServer
};
