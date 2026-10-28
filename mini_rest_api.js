
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. CONFIGURATION AND CONSTANTS
// ============================================

const LIMITS = Object.freeze({
  TITLE_MIN: 2,
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 500,
  STATUS_VALUES: ["pending", "in-progress", "completed"]
});

const ALLOWED_FIELDS = ["title", "description", "status"];

// ============================================
// 2. IN-MEMORY DATA REPOSITORY
// ============================================

const taskRepository = (() => {
  let tasks = [
    {
      id: 1,
      title: "Learn Node.js",
      description: "Understand Node.js fundamentals",
      status: "completed"
    },
    {
      id: 2,
      title: "Learn Express.js",
      description: "Build REST APIs using Express",
      status: "in-progress"
    },
    {
      id: 3,
      title: "Build Mini REST API",
      description: "Practice CRUD operations",
      status: "pending"
    }
  ];

  let nextId = 4;

  return {
    getAll() {
      return tasks.map(task => ({ ...task }));
    },

    getById(id) {
      const task = tasks.find(item => item.id === id);
      return task ? { ...task } : null;
    },

    create(data) {
      const task = {
        id: nextId++,
        title: data.title.trim(),
        description: data.description.trim(),
        status: data.status
      };

      tasks.push(task);
      return { ...task };
    },

    replace(id, data) {
      const index = tasks.findIndex(item => item.id === id);
      if (index === -1) return null;

      tasks[index] = {
        id,
        title: data.title.trim(),
        description: data.description.trim(),
        status: data.status
      };

      return { ...tasks[index] };
    },

    update(id, data) {
      const index = tasks.findIndex(item => item.id === id);
      if (index === -1) return null;

      const current = tasks[index];

      const updated = {
        ...current,
        ...data,
        title: data.title === undefined
          ? current.title
          : data.title.trim(),
        description: data.description === undefined
          ? current.description
          : data.description.trim()
      };

      tasks[index] = updated;
      return { ...updated };
    },

    delete(id) {
      const index = tasks.findIndex(item => item.id === id);
      if (index === -1) return null;

      return { ...tasks.splice(index, 1)[0] };
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
// 4. CUSTOM ERROR CLASS
// ============================================

class AppError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ============================================
// 5. CENTRALIZED ID VALIDATION
// ============================================

function validateId(req, res, next) {
  const rawId = req.params.id;

  if (!/^[1-9]\d*$/.test(rawId)) {
    return next(
      new AppError(400, "ID must be a positive integer.")
    );
  }

  const id = Number(rawId);

  if (!Number.isSafeInteger(id)) {
    return next(
      new AppError(400, "ID is outside the supported range.")
    );
  }

  req.taskId = id;
  next();
}

// ============================================
// 6. REQUEST BODY VALIDATION
// ============================================

function validateTask(data, partial = false) {
  if (
    data === null ||
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
      details: invalidFields
    };
  }

  if (!partial) {
    const missingFields = ALLOWED_FIELDS.filter(
      field => !Object.prototype.hasOwnProperty.call(data, field)
    );

    if (missingFields.length > 0) {
      return {
        valid: false,
        message: "Title, description, and status are required.",
        details: missingFields
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "title")) {
    if (
      typeof data.title !== "string" ||
      data.title.trim().length < LIMITS.TITLE_MIN ||
      data.title.trim().length > LIMITS.TITLE_MAX
    ) {
      return {
        valid: false,
        message: "Title must be between 2 and 100 characters."
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    if (
      typeof data.description !== "string" ||
      data.description.trim().length > LIMITS.DESCRIPTION_MAX
    ) {
      return {
        valid: false,
        message: "Description must not exceed 500 characters."
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "status")) {
    if (!LIMITS.STATUS_VALUES.includes(data.status)) {
      return {
        valid: false,
        message: "Status must be pending, in-progress, or completed."
      };
    }
  }

  return { valid: true };
}

function validateRequest(partial = false) {
  return (req, res, next) => {
    const result = validateTask(req.body, partial);

    if (!result.valid) {
      return next(
        new AppError(400, result.message, result.details)
      );
    }

    next();
  };
}

// ============================================
// 7. HOME ROUTE / API DOCUMENTATION
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Mini REST API",
    resource: "Tasks",
    endpoints: {
      getAllTasks: "GET /api/tasks",
      getTaskById: "GET /api/tasks/:id",
      createTask: "POST /api/tasks",
      replaceTask: "PUT /api/tasks/:id",
      updateTask: "PATCH /api/tasks/:id",
      deleteTask: "DELETE /api/tasks/:id",
      healthCheck: "GET /health"
    },
    validStatuses: LIMITS.STATUS_VALUES
  });
});

// ============================================
// 8. READ ALL TASKS
// GET /api/tasks
// ============================================

app.get("/api/tasks", (req, res) => {
  const tasks = taskRepository.getAll();

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// ============================================
// 9. READ ONE TASK
// GET /api/tasks/:id
// ============================================

app.get("/api/tasks/:id", validateId, (req, res, next) => {
  const task = taskRepository.getById(req.taskId);

  if (!task) {
    return next(new AppError(404, "Task not found."));
  }

  res.status(200).json({
    success: true,
    data: task
  });
});

// ============================================
// 10. CREATE TASK
// POST /api/tasks
// ============================================

app.post(
  "/api/tasks",
  validateRequest(),
  (req, res) => {
    const task = taskRepository.create(req.body);

    res.status(201).json({
      success: true,
      message: "Task created successfully.",
      data: task
    });
  }
);

// ============================================
// 11. REPLACE TASK
// PUT /api/tasks/:id
// ============================================

app.put(
  "/api/tasks/:id",
  validateId,
  validateRequest(),
  (req, res, next) => {
    const task = taskRepository.replace(req.taskId, req.body);

    if (!task) {
      return next(new AppError(404, "Task not found."));
    }

    res.status(200).json({
      success: true,
      message: "Task replaced successfully.",
      data: task
    });
  }
);

// ============================================
// 12. PARTIALLY UPDATE TASK
// PATCH /api/tasks/:id
// ============================================

app.patch(
  "/api/tasks/:id",
  validateId,
  validateRequest(true),
  (req, res, next) => {
    const task = taskRepository.update(req.taskId, req.body);

    if (!task) {
      return next(new AppError(404, "Task not found."));
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully.",
      data: task
    });
  }
);

// ============================================
// 13. DELETE TASK
// DELETE /api/tasks/:id
// ============================================

app.delete("/api/tasks/:id", validateId, (req, res, next) => {
  const task = taskRepository.delete(req.taskId);

  if (!task) {
    return next(new AppError(404, "Task not found."));
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully.",
    data: task
  });
});

// ============================================
// 14. HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// ============================================
// 15. UNKNOWN ROUTE HANDLER
// ============================================

app.use((req, res, next) => {
  next(new AppError(404, "Endpoint not found."));
});

// ============================================
// 16. CENTRALIZED ERROR HANDLER
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

  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    message: statusCode === 500
      ? "Internal server error."
      : err.message
  };

  if (err.details !== undefined) {
    response.details = err.details;
  }

  res.status(statusCode).json(response);
});

// ============================================
// 17. START SERVER
// ============================================

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Mini REST API running at http://localhost:${PORT}`);
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
