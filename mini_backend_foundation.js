
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

// Project configuration
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

// Basic logging
function log(level, message) {
  console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
}

const logger = {
  info: (message) => log("INFO", message),
  error: (message) => log("ERROR", message)
};

// Initialize the data file
async function initializeFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;

    const initialUsers = [
      { id: 1, name: "Rahul Sharma", email: "rahul@example.com" },
      { id: 2, name: "Priya Patil", email: "priya@example.com" }
    ];

    await fs.writeFile(
      DATA_FILE,
      JSON.stringify(initialUsers, null, 2),
      "utf8"
    );
  }
}

// File system operations
async function getUsers() {
  await initializeFile();

  const content = await fs.readFile(DATA_FILE, "utf8");

  try {
    const users = JSON.parse(content);

    if (!Array.isArray(users)) {
      throw new Error("User data must be an array.");
    }

    return users;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The user data file contains invalid JSON.");
    }

    throw error;
  }
}

async function saveUsers(users) {
  const temporaryFile = `${DATA_FILE}.tmp`;

  await fs.writeFile(
    temporaryFile,
    JSON.stringify(users, null, 2),
    "utf8"
  );

  await fs.rename(temporaryFile, DATA_FILE);
}

// Send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(data));
}

// Read a JSON request body
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    const maxSize = 1024 * 1024;

    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);

      if (size > maxSize) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }

      body += chunk;
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// Request handler and API routes
async function handleRequest(req, res) {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  const method = req.method;

  logger.info(`${method} ${pathname}`);

  // Route 1: Home
  if (pathname === "/" && method === "GET") {
    return sendJSON(res, 200, {
      success: true,
      message: "Welcome to the Mini Backend Foundation Project!"
    });
  }

  // Route 2: Health check
  if (pathname === "/health" && method === "GET") {
    return sendJSON(res, 200, {
      success: true,
      status: "healthy"
    });
  }

  // Route 3: Get all users
  if (pathname === "/api/users" && method === "GET") {
    const users = await getUsers();

    return sendJSON(res, 200, {
      success: true,
      count: users.length,
      users
    });
  }

  // Route 4: Create a new user
  if (pathname === "/api/users" && method === "POST") {
    if (!(req.headers["content-type"] || "").includes("application/json")) {
      return sendJSON(res, 415, {
        success: false,
        message: "Content-Type must be application/json."
      });
    }

    let body;

    try {
      body = JSON.parse(await readBody(req));
    } catch (error) {
      return sendJSON(res, error.statusCode || 400, {
        success: false,
        message: error.statusCode === 413
          ? error.message
          : "Invalid JSON request body."
      });
    }

    if (
      !body ||
      typeof body.name !== "string" ||
      !body.name.trim() ||
      typeof body.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ) {
      return sendJSON(res, 400, {
        success: false,
        message: "Please provide a valid name and email address."
      });
    }

    const users = await getUsers();

    if (
      users.some(
        (user) =>
          user.email.toLowerCase() === body.email.trim().toLowerCase()
      )
    ) {
      return sendJSON(res, 409, {
        success: false,
        message: "This email address already exists."
      });
    }

    const nextId =
      users.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1;

    const newUser = {
      id: nextId,
      name: body.name.trim(),
      email: body.email.trim()
    };

    users.push(newUser);
    await saveUsers(users);

    logger.info(`Created user with ID ${newUser.id}`);

    return sendJSON(res, 201, {
      success: true,
      message: "User created successfully.",
      user: newUser
    });
  }

  // Route 5: Get a user by ID
  const match = pathname.match(/^\/api\/users\/(\d+)$/);

  if (match && method === "GET") {
    const id = Number(match[1]);
    const users = await getUsers();
    const user = users.find((item) => item.id === id);

    if (!user) {
      return sendJSON(res, 404, {
        success: false,
        message: "User not found."
      });
    }

    return sendJSON(res, 200, {
      success: true,
      user
    });
  }

  // Unsupported methods on known routes
  const knownPath =
    pathname === "/" ||
    pathname === "/health" ||
    pathname === "/api/users" ||
    /^\/api\/users\/\d+$/.test(pathname);

  if (knownPath) {
    res.setHeader(
      "Allow",
      pathname === "/api/users" ? "GET, POST" : "GET"
    );

    return sendJSON(res, 405, {
      success: false,
      message: "Method not allowed."
    });
  }

  // Route 6: Not found
  return sendJSON(res, 404, {
    success: false,
    message: "Route not found."
  });
}

// Create the HTTP server
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    logger.error(error.stack || error.message);

    if (!res.headersSent) {
      sendJSON(res, 500, {
        success: false,
        message: "Internal server error."
      });
    } else if (!res.writableEnded) {
      res.destroy();
    }
  });
});

// Handle server errors
server.on("error", (error) => {
  logger.error(`Server error: ${error.message}`);
  process.exitCode = 1;
});

// Start the server
initializeFile()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error(`Initialization failed: ${error.message}`);
    process.exitCode = 1;
  });

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down server.");

  server.close(() => {
    process.exit(0);
  });
});
