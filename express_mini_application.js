
const express = require("express");
const path = require("node:path");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. MIDDLEWARE CONFIGURATION
// ============================================

// Parse incoming form data
app.use(express.urlencoded({ extended: true }));

// Parse incoming JSON data
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Custom request logger middleware
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url}`
  );
  next();
});

// ============================================
// 2. SAMPLE STUDENT DATA
// ============================================

const students = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul@example.com",
    course: "Node.js"
  },
  {
    id: 2,
    name: "Priya Patil",
    email: "priya@example.com",
    course: "Express.js"
  }
];

let nextId = 3;

// ============================================
// 3. HOME ROUTE
// ============================================

app.get("/", (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Express Mini Application</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          background: #f4f6f9;
          color: #222;
        }
        h1 { color: #2457a7; }
        a, button {
          display: inline-block;
          margin: 8px 8px 8px 0;
          padding: 10px 15px;
          background: #2457a7;
          color: white;
          text-decoration: none;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Express Mini Application</h1>
      <p>Welcome to the Student Registration System.</p>

      <div class="card">
        <h2>Available Features</h2>
        <a href="/students">View Students</a>
        <a href="/register">Register Student</a>
        <a href="/api/students">View Student API</a>
        <a href="/health">Health Check</a>
      </div>
    </body>
    </html>
  `);
});

// ============================================
// 4. DISPLAY ALL STUDENTS
// ============================================

app.get("/students", (req, res) => {
  const studentRows = students.map(student => `
    <tr>
      <td>${student.id}</td>
      <td>${escapeHtml(student.name)}</td>
      <td>${escapeHtml(student.email)}</td>
      <td>${escapeHtml(student.course)}</td>
    </tr>
  `).join("");

  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Student List</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
        th { background: #2457a7; color: white; }
        a { display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Registered Students</h1>
      ${students.length ? `
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Email</th><th>Course</th>
            </tr>
          </thead>
          <tbody>${studentRows}</tbody>
        </table>
      ` : "<p>No students registered yet.</p>"}
      <a href="/">Home</a> |
      <a href="/register">Register a Student</a>
    </body>
    </html>
  `);
});

// ============================================
// 5. REGISTRATION FORM
// ============================================

app.get("/register", (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Register Student</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: 40px auto;
          padding: 20px;
          background: #f4f6f9;
        }
        form {
          background: white;
          padding: 25px;
          border-radius: 8px;
        }
        label { display: block; margin-top: 15px; }
        input, select {
          box-sizing: border-box;
          width: 100%;
          padding: 10px;
          margin-top: 5px;
        }
        button {
          margin-top: 20px;
          padding: 10px 15px;
          background: #2457a7;
          color: white;
          border: none;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <h1>Student Registration</h1>
      <form action="/register" method="POST">
        <label for="name">Full Name</label>
        <input id="name" type="text" name="name"
               maxlength="80" required>

        <label for="email">Email Address</label>
        <input id="email" type="email" name="email"
               maxlength="254" required>

        <label for="course">Select Course</label>
        <select id="course" name="course" required>
          <option value="">-- Select Course --</option>
          <option value="Node.js">Node.js</option>
          <option value="Express.js">Express.js</option>
          <option value="JavaScript">JavaScript</option>
          <option value="Web Development">Web Development</option>
        </select>

        <button type="submit">Register</button>
      </form>
      <p><a href="/">Home</a> | <a href="/students">View Students</a></p>
    </body>
    </html>
  `);
});

// ============================================
// 6. HANDLE FORM SUBMISSION
// ============================================

app.post("/register", (req, res) => {
  const { name, email, course } = req.body;

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim() : "";
  const cleanCourse = typeof course === "string" ? course.trim() : "";

  const allowedCourses = [
    "Node.js",
    "Express.js",
    "JavaScript",
    "Web Development"
  ];

  if (
    cleanName.length < 2 ||
    cleanName.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(cleanName)
  ) {
    return res.status(400).send(
      "Invalid name. Enter a name between 2 and 80 characters."
    );
  }

  if (
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return res.status(400).send("Please provide a valid email address.");
  }

  if (!allowedCourses.includes(cleanCourse)) {
    return res.status(400).send("Please select a valid course.");
  }

  const duplicate = students.some(
    student => student.email.toLowerCase() === cleanEmail.toLowerCase()
  );

  if (duplicate) {
    return res.status(409).send(
      "A student with this email address is already registered."
    );
  }

  const newStudent = {
    id: nextId++,
    name: cleanName,
    email: cleanEmail,
    course: cleanCourse
  };

  students.push(newStudent);

  // Redirect after successful form submission
  res.redirect(303, "/students");
});

// ============================================
// 7. JSON API ROUTES
// ============================================

app.get("/api/students", (req, res) => {
  res.status(200).json({
    success: true,
    count: students.length,
    data: students
  });
});

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
// 8. HEALTH CHECK ROUTE
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// ============================================
// 9. STATIC FILE DEMONSTRATION
// ============================================

// Express serves files placed in the "public" folder.
// Example: public/about.html is available at /about.html.

// ============================================
// 10. 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>404 Not Found</title></head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The requested URL does not exist.</p>
      <a href="/">Return Home</a>
    </body>
    </html>
  `);
});

// ============================================
// 11. CENTRAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error("Application error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// ============================================
// 12. HELPER FUNCTION
// ============================================

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

// ============================================
// 13. START SERVER
// ============================================

const server = app.listen(PORT, () => {
  console.log("-------------------------------------");
  console.log(" Express Mini Application Started");
  console.log(` URL: http://localhost:${PORT}`);
  console.log("-------------------------------------");
});

// Graceful shutdown
function shutdown() {
  console.log("Shutting down server...");

  server.close(error => {
    if (error) {
      console.error("Error closing server:", error);
      process.exitCode = 1;
    } else {
      console.log("Server closed successfully.");
    }
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
