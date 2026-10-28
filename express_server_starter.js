
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

// ========================================
// EXPRESS SERVER STARTER KIT
// ========================================

// Load environment variables from .env if available.
// No dotenv package is required for this implementation.
function loadEnv() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ========================================
// CONFIGURATION
// ========================================

app.disable("x-powered-by");

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ========================================
// REQUEST LOGGING MIDDLEWARE
// ========================================

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    console.log(
      `[${new Date().toISOString()}] ` +
      `${req.method} ${req.originalUrl} ` +
      `${res.statusCode} ${Date.now() - startTime}ms`
    );
  });

  next();
});

// ========================================
// ROUTES
// ========================================

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Express Server Starter Kit!",
    environment: NODE_ENV
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// API information route
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Express API is running.",
    availableRoutes: [
      "GET /",
      "GET /health",
      "GET /api",
      "GET /api/greeting?name=Rahul"
    ]
  });
});

// Example route using query parameters
app.get("/api/greeting", (req, res) => {
  const name = req.query.name || "Developer";

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid name."
    });
  }

  res.status(200).json({
    success: true,
    message: `Hello, ${name.trim()}! Welcome to Express.js.`
  });
});

// Example POST route
app.post("/api/demo", (req, res) => {
  const { title, description } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "The title field is required."
    });
  }

  res.status(201).json({
    success: true,
    message: "Demo data received successfully.",
    data: {
      title: title.trim(),
      description:
        typeof description === "string" ? description.trim() : ""
    }
  });
});

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.stack || err.message}`);

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

// ========================================
// SERVER INITIALIZATION
// ========================================

const server = app.listen(PORT, () => {
  console.log("==================================");
  console.log(" EXPRESS SERVER STARTER KIT");
  console.log("==================================");
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop the server.");
});

server.on("error", (err) => {
  console.error(`Server failed to start: ${err.message}`);
  process.exitCode = 1;
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...");

  server.close(() => {
    console.log("Server closed successfully.");
    process.exit(0);
  });
});
