
const express = require("express");
const dotenv = require("dotenv");
const path = require("node:path");

// ============================================
// 1. CONFIGURATION
// ============================================

dotenv.config({
  path: path.resolve(process.cwd(), ".env")
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be between 1 and 65535.");
}

app.disable("x-powered-by");

// ============================================
// 2. BUILT-IN MIDDLEWARE
// ============================================

app.use(express.json({ limit: "100kb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb"
  })
);

// ============================================
// 3. REQUEST LOGGER MIDDLEWARE
// ============================================

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    // Remove control characters from logged paths.
    const safePath = req.originalUrl.replace(/[\r\n\t]/g, "");

    console.log(
      `[${new Date().toISOString()}] ` +
      `${req.method} ${safePath} ` +
      `${res.statusCode} ${Date.now() - startTime}ms`
    );
  });

  next();
});

// ============================================
// 4. CONTROLLERS AND ROUTES
// ============================================

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Express Server Starter Kit!",
    environment: NODE_ENV
  });
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// API information
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Express API is running.",
    routes: [
      "GET /",
      "GET /health",
      "GET /api",
      "GET /api/greeting?name=Rahul",
      "POST /api/demo"
    ]
  });
});

// Greeting route with input validation
app.get("/api/greeting", (req, res) => {
  const name = req.query.name === undefined
    ? "Developer"
    : req.query.name;

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.trim().length > 50 ||
    !/^[\p{L}\p{N} .'-]+$/u.test(name.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Name must contain 1–50 valid letters, numbers or spaces."
    });
  }

  res.status(200).json({
    success: true,
    message: `Hello, ${name.trim()}! Welcome to Express.js.`
  });
});

// Example POST route
app.post("/api/demo", (req, res) => {
  const { title, description = "" } = req.body || {};

  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.trim().length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Title is required and must not exceed 100 characters."
    });
  }

  if (
    typeof description !== "string" ||
    description.length > 500
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be a string of at most 500 characters."
    });
  }

  res.status(201).json({
    success: true,
    message: "Demo data received successfully.",
    data: {
      title: title.trim(),
      description: description.trim()
    }
  });
});

// ============================================
// 5. 404 MIDDLEWARE
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

// ============================================
// 6. CENTRAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error(
    `[ERROR] ${req.method} ${req.path}: ${err.message}`
  );

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
// 7. SERVER INITIALIZATION
// ============================================

const server = app.listen(PORT, () => {
  console.log("======================================");
  console.log("     EXPRESS SERVER STARTER KIT");
  console.log("======================================");
  console.log(`Environment : ${NODE_ENV}`);
  console.log(`Server URL  : http://localhost:${PORT}`);
  console.log("Server is running successfully.");
});

server.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  process.exitCode = 1;
});

// ============================================
// 8. GRACEFUL SHUTDOWN
// ============================================

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received. Closing server...`);

  const timeout = setTimeout(() => {
    console.error("Shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000);

  timeout.unref();

  server.close((error) => {
    clearTimeout(timeout);

    if (error) {
      console.error(`Shutdown error: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    console.log("Server closed successfully.");
  });

  if (typeof server.closeIdleConnections === "function") {
    server.closeIdleConnections();
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
