
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. CONSTANTS
// ============================================

const LIMITS = Object.freeze({
  NAME_MIN: 2,
  NAME_MAX: 100,
  CATEGORY_MIN: 2,
  CATEGORY_MAX: 80,
  MIN_QUANTITY: 0,
  MAX_QUANTITY: 1000000,
  MIN_PRICE: 0,
  MAX_PRICE: 1000000000
});

const ALLOWED_FIELDS = ["name", "category", "quantity", "price"];

// ============================================
// 2. IN-MEMORY INVENTORY DATA
// ============================================

const inventoryRepository = (() => {
  let items = [
    {
      id: 1,
      name: "Laptop",
      category: "Electronics",
      quantity: 10,
      price: 55000
    },
    {
      id: 2,
      name: "Office Chair",
      category: "Furniture",
      quantity: 15,
      price: 4500
    },
    {
      id: 3,
      name: "Keyboard",
      category: "Accessories",
      quantity: 25,
      price: 1200
    }
  ];

  let nextId = 4;

  return {
    getAll() {
      return items.map(item => ({ ...item }));
    },

    getById(id) {
      const item = items.find(product => product.id === id);
      return item ? { ...item } : null;
    },

    create(data) {
      const item = {
        id: nextId++,
        name: data.name.trim(),
        category: data.category.trim(),
        quantity: data.quantity,
        price: data.price
      };

      items.push(item);
      return { ...item };
    },

    update(id, data) {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return null;

      items[index] = {
        id,
        name: data.name.trim(),
        category: data.category.trim(),
        quantity: data.quantity,
        price: data.price
      };

      return { ...items[index] };
    },

    patch(id, data) {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return null;

      const current = items[index];

      const updated = {
        ...current,
        ...data,
        name: data.name === undefined ? current.name : data.name.trim(),
        category: data.category === undefined
          ? current.category
          : data.category.trim()
      };

      items[index] = updated;
      return { ...updated };
    },

    delete(id) {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return null;

      return { ...items.splice(index, 1)[0] };
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
// 4. ID VALIDATION
// ============================================

function validateId(req, res, next) {
  const rawId = req.params.id;

  if (!/^[1-9]\d*$/.test(rawId)) {
    return res.status(400).json({
      success: false,
      message: "Item ID must be a positive integer."
    });
  }

  const id = Number(rawId);

  if (!Number.isSafeInteger(id)) {
    return res.status(400).json({
      success: false,
      message: "Item ID is outside the supported range."
    });
  }

  req.itemId = id;
  next();
}

// ============================================
// 5. INPUT VALIDATION
// ============================================

function validateField(field, value) {
  switch (field) {
    case "name":
      return (
        typeof value === "string" &&
        value.trim().length >= LIMITS.NAME_MIN &&
        value.trim().length <= LIMITS.NAME_MAX
      );

    case "category":
      return (
        typeof value === "string" &&
        value.trim().length >= LIMITS.CATEGORY_MIN &&
        value.trim().length <= LIMITS.CATEGORY_MAX
      );

    case "quantity":
      return (
        Number.isSafeInteger(value) &&
        value >= LIMITS.MIN_QUANTITY &&
        value <= LIMITS.MAX_QUANTITY
      );

    case "price":
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= LIMITS.MIN_PRICE &&
        value <= LIMITS.MAX_PRICE
      );

    default:
      return false;
  }
}

function validateItem(data, partial = false) {
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
      fields: invalidFields
    };
  }

  if (!partial) {
    const requiredFields = ALLOWED_FIELDS.filter(
      field => !Object.prototype.hasOwnProperty.call(data, field)
    );

    if (requiredFields.length > 0) {
      return {
        valid: false,
        message: "Name, category, quantity, and price are required.",
        fields: requiredFields
      };
    }
  }

  for (const field of fields) {
    if (!validateField(field, data[field])) {
      const messages = {
        name: "Name must be between 2 and 100 characters.",
        category: "Category must be between 2 and 80 characters.",
        quantity: "Quantity must be an integer between 0 and 1000000.",
        price: "Price must be a number between 0 and 1000000000."
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
// 6. HOME / API DOCUMENTATION
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Inventory Management API",
    endpoints: {
      getAllItems: "GET /api/inventory",
      getItemById: "GET /api/inventory/:id",
      createItem: "POST /api/inventory",
      replaceItem: "PUT /api/inventory/:id",
      partiallyUpdateItem: "PATCH /api/inventory/:id",
      deleteItem: "DELETE /api/inventory/:id",
      healthCheck: "GET /health"
    }
  });
});

// ============================================
// 7. READ ALL INVENTORY ITEMS
// GET /api/inventory
// ============================================

app.get("/api/inventory", (req, res) => {
  const items = inventoryRepository.getAll();

  res.status(200).json({
    success: true,
    count: items.length,
    data: items
  });
});

// ============================================
// 8. READ INVENTORY ITEM BY ID
// GET /api/inventory/:id
// ============================================

app.get("/api/inventory/:id", validateId, (req, res) => {
  const item = inventoryRepository.getById(req.itemId);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Inventory item not found."
    });
  }

  res.status(200).json({
    success: true,
    data: item
  });
});

// ============================================
// 9. CREATE INVENTORY ITEM
// POST /api/inventory
// ============================================

app.post("/api/inventory", (req, res) => {
  const validation = validateItem(req.body);

  if (!validation.valid) {
    return sendValidationError(res, validation);
  }

  const item = inventoryRepository.create(req.body);

  res.status(201).json({
    success: true,
    message: "Inventory item created successfully.",
    data: item
  });
});

// ============================================
// 10. REPLACE INVENTORY ITEM
// PUT /api/inventory/:id
// ============================================

app.put("/api/inventory/:id", validateId, (req, res) => {
  const validation = validateItem(req.body);

  if (!validation.valid) {
    return sendValidationError(res, validation);
  }

  const item = inventoryRepository.update(req.itemId, req.body);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Inventory item not found."
    });
  }

  res.status(200).json({
    success: true,
    message: "Inventory item replaced successfully.",
    data: item
  });
});

// ============================================
// 11. PARTIALLY UPDATE INVENTORY ITEM
// PATCH /api/inventory/:id
// ============================================

app.patch("/api/inventory/:id", validateId, (req, res) => {
  const validation = validateItem(req.body, true);

  if (!validation.valid) {
    return sendValidationError(res, validation);
  }

  const item = inventoryRepository.patch(req.itemId, req.body);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Inventory item not found."
    });
  }

  res.status(200).json({
    success: true,
    message: "Inventory item updated successfully.",
    data: item
  });
});

// ============================================
// 12. DELETE INVENTORY ITEM
// DELETE /api/inventory/:id
// ============================================

app.delete("/api/inventory/:id", validateId, (req, res) => {
  const item = inventoryRepository.delete(req.itemId);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Inventory item not found."
    });
  }

  res.status(200).json({
    success: true,
    message: "Inventory item deleted successfully.",
    data: item
  });
});

// ============================================
// 13. HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// ============================================
// 14. 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found."
  });
});

// ============================================
// 15. CENTRAL ERROR HANDLER
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
// 16. START SERVER
// ============================================

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Inventory API running at http://localhost:${PORT}`);
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
