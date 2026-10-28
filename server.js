
const http = require("node:http");

const PORT = process.env.PORT || 3000;

// Sample user data
const users = [
  { id: 1, name: "Rahul" },
  { id: 2, name: "Priya" },
  { id: 3, name: "Amit" },
];

// Send a JSON response
function sendJSON(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });

  res.end(JSON.stringify(data));
}

// Handle HTTP requests and routes
function handleRequest(req, res) {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  const method = req.method;

  // Route 1: Home
  if (pathname === "/" && method === "GET") {
    return sendJSON(res, 200, {
      success: true,
      message: "Welcome to the Mini Web Server!",
    });
  }

  // Route 2: Health check
  if (pathname === "/health" && method === "GET") {
    return sendJSON(res, 200, {
      success: true,
      status: "healthy",
    });
  }

  // Route 3: Get all users
  if (pathname === "/api/users" && method === "GET") {
    return sendJSON(res, 200, {
      success: true,
      count: users.length,
      users,
    });
  }

  // Route 4: Get a user by ID
  const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);

  if (userMatch) {
    if (method !== "GET") {
      return sendJSON(
        res,
        405,
        {
          success: false,
          message: "Method not allowed. Use GET.",
        },
        { Allow: "GET" }
      );
    }

    const userId = Number(userMatch[1]);
    const user = users.find((item) => item.id === userId);

    if (!user) {
      return sendJSON(res, 404, {
        success: false,
        message: "User not found",
      });
    }

    return sendJSON(res, 200, {
      success: true,
      user,
    });
  }

  // Handle unsupported methods on known routes
  const knownPaths = ["/", "/health", "/api/users"];

  if (knownPaths.includes(pathname) && method !== "GET") {
    return sendJSON(
      res,
      405,
      {
        success: false,
        message: "Method not allowed. Use GET.",
      },
      { Allow: "GET" }
    );
  }

  // Route 5: 404 Not Found
  return sendJSON(res, 404, {
    success: false,
    message: "Route not found",
  });
}

// Create the HTTP server
const server = http.createServer((req, res) => {
  try {
    handleRequest(req, res);
  } catch (error) {
    console.error("Request error:", error.message);

    if (!res.headersSent) {
      sendJSON(res, 500, {
        success: false,
        message: "Internal server error",
      });
    } else if (!res.writableEnded) {
      res.destroy();
    }
  }
});

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error.message);
  process.exitCode = 1;
});

// Start the server
server.listen(PORT, () => {
  console.log(`Mini Web Server running at http://localhost:${PORT}`);
});
