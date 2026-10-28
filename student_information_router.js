
const express = require("express");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// ========================================
// 1. STUDENT ROUTER
// ========================================

const studentRouter = express.Router();

const students = [
  {
    id: 1,
    name: "Rahul Sharma",
    age: 21,
    course: "Computer Science",
    department: "Computer Engineering",
    email: "rahul@example.com"
  },
  {
    id: 2,
    name: "Amit Patil",
    age: 22,
    course: "Information Technology",
    department: "IT Department",
    email: "amit@example.com"
  },
  {
    id: 3,
    name: "Vijay Deshmukh",
    age: 20,
    course: "Electronics",
    department: "Electronics Department",
    email: "vijay@example.com"
  }
];

// GET all students
studentRouter.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    totalStudents: students.length,
    data: students
  });
});

// GET a student by ID
studentRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Student ID must be a positive integer."
    });
  }

  const student = students.find((item) => item.id === id);

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

// ========================================
// 2. COURSE ROUTER
// ========================================

const courseRouter = express.Router();

const courses = [
  {
    id: 101,
    name: "Computer Science",
    duration: "4 years",
    fees: 80000,
    description: "Study of programming, algorithms, and computing."
  },
  {
    id: 102,
    name: "Information Technology",
    duration: "4 years",
    fees: 75000,
    description: "Study of software, networks, and information systems."
  },
  {
    id: 103,
    name: "Electronics",
    duration: "4 years",
    fees: 70000,
    description: "Study of electronic circuits and communication systems."
  }
];

// GET all courses
courseRouter.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    totalCourses: courses.length,
    data: courses
  });
});

// GET a course by ID
courseRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Course ID must be a positive integer."
    });
  }

  const course = courses.find((item) => item.id === id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found."
    });
  }

  res.status(200).json({
    success: true,
    data: course
  });
});

// ========================================
// 3. DEPARTMENT ROUTER
// ========================================

const departmentRouter = express.Router();

const departments = [
  {
    id: 1,
    name: "Computer Engineering",
    head: "Dr. Sunita Joshi",
    location: "Block A",
    totalFaculty: 15
  },
  {
    id: 2,
    name: "IT Department",
    head: "Dr. Rajesh Kulkarni",
    location: "Block B",
    totalFaculty: 12
  },
  {
    id: 3,
    name: "Electronics Department",
    head: "Dr. Priya Patil",
    location: "Block C",
    totalFaculty: 10
  }
];

// GET all departments
departmentRouter.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    totalDepartments: departments.length,
    data: departments
  });
});

// GET a department by ID
departmentRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Department ID must be a positive integer."
    });
  }

  const department = departments.find((item) => item.id === id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found."
    });
  }

  res.status(200).json({
    success: true,
    data: department
  });
});

// ========================================
// 4. REGISTER ROUTERS
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Student Information System",
    availableRoutes: [
      "/students",
      "/students/1",
      "/courses",
      "/courses/101",
      "/departments",
      "/departments/1"
    ]
  });
});

app.use("/students", studentRouter);
app.use("/courses", courseRouter);
app.use("/departments", departmentRouter);

// ========================================
// 5. HANDLE UNKNOWN ROUTES
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

// ========================================
// 6. START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(`Student Information Router running at http://localhost:${PORT}`);
});
