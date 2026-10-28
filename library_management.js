
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/library_management";

app.use(express.json());

// ============================================
// 1. AUTHOR SCHEMA AND MODEL
// ============================================

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Author name is required."],
      trim: true,
      minlength: [2, "Author name must contain at least 2 characters."],
      maxlength: [100, "Author name cannot exceed 100 characters."]
    },
    email: {
      type: String,
      required: [true, "Author email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address."
      ]
    },
    biography: {
      type: String,
      trim: true,
      maxlength: [1000, "Biography cannot exceed 1000 characters."],
      default: ""
    },
    birthDate: {
      type: Date,
      validate: {
        validator: value => !value || value <= new Date(),
        message: "Birth date cannot be in the future."
      }
    }
  },
  { timestamps: true, versionKey: false }
);

const Author = mongoose.model("Author", authorSchema);

// ============================================
// 2. CATEGORY SCHEMA AND MODEL
// ============================================

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required."],
      unique: true,
      trim: true,
      minlength: [2, "Category name must contain at least 2 characters."],
      maxlength: [60, "Category name cannot exceed 60 characters."]
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

const Category = mongoose.model("Category", categorySchema);

// ============================================
// 3. BOOK SCHEMA AND MODEL
// ============================================

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required."],
      trim: true,
      minlength: [1, "Book title cannot be empty."],
      maxlength: [200, "Book title cannot exceed 200 characters."]
    },
    isbn: {
      type: String,
      required: [true, "ISBN is required."],
      unique: true,
      trim: true,
      match: [
        /^(?:\d{10}|\d{13})$/,
        "ISBN must contain 10 or 13 digits without hyphens."
      ]
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
      required: [true, "Every book must have an author."]
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Every book must have a category."]
    },
    publishedYear: {
      type: Number,
      required: [true, "Published year is required."],
      min: [1000, "Published year must be 1000 or later."],
      max: [
        new Date().getFullYear(),
        "Published year cannot be in the future."
      ],
      validate: {
        validator: Number.isInteger,
        message: "Published year must be an integer."
      }
    },
    price: {
      type: Number,
      required: [true, "Book price is required."],
      min: [0, "Price cannot be negative."]
    },
    availableCopies: {
      type: Number,
      required: [true, "Available copies are required."],
      min: [0, "Available copies cannot be negative."],
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: "Available copies must be an integer."
      }
    }
  },
  { timestamps: true, versionKey: false }
);

const Book = mongoose.model("Book", bookSchema);

// ============================================
// 4. HOME ROUTE / API DOCUMENTATION
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Library Management API",
    models: ["Author", "Category", "Book"],
    endpoints: {
      authors: "/api/authors",
      categories: "/api/categories",
      books: "/api/books",
      bookDetails: "/api/books/:id"
    }
  });
});

// ============================================
// 5. AUTHOR API
// ============================================

// Create an author
app.post("/api/authors", async (req, res, next) => {
  try {
    const author = await Author.create(req.body);

    res.status(201).json({
      success: true,
      message: "Author created successfully.",
      data: author
    });
  } catch (error) {
    next(error);
  }
});

// Get all authors
app.get("/api/authors", async (req, res, next) => {
  try {
    const authors = await Author.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: authors.length,
      data: authors
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 6. CATEGORY API
// ============================================

// Create a category
app.post("/api/categories", async (req, res, next) => {
  try {
    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// Get all categories
app.get("/api/categories", async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 7. BOOK API
// ============================================

// Create a book
app.post("/api/books", async (req, res, next) => {
  try {
    const { author, category } = req.body;

    if (
      !mongoose.isObjectIdOrHexString(author) ||
      !mongoose.isObjectIdOrHexString(category)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid author and category IDs are required."
      });
    }

    // Confirm that the referenced documents exist.
    const [authorExists, categoryExists] = await Promise.all([
      Author.exists({ _id: author }),
      Category.exists({ _id: category })
    ]);

    if (!authorExists || !categoryExists) {
      return res.status(400).json({
        success: false,
        message: "The specified author or category does not exist."
      });
    }

    const book = await Book.create(req.body);

    res.status(201).json({
      success: true,
      message: "Book created successfully.",
      data: book
    });
  } catch (error) {
    next(error);
  }
});

// Get all books with author and category details
app.get("/api/books", async (req, res, next) => {
  try {
    const books = await Book.find()
      .populate("author", "name email")
      .populate("category", "name description")
      .sort({ title: 1 });

    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    next(error);
  }
});

// Get one book by ID
app.get("/api/books/:id", async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID."
      });
    }

    const book = await Book.findById(req.params.id)
      .populate("author", "name email biography")
      .populate("category", "name description");

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found."
      });
    }

    res.status(200).json({
      success: true,
      data: book
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 8. 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

// ============================================
// 9. CENTRALIZED ERROR HANDLER
// ============================================

app.use((error, req, res, next) => {
  console.error(error.message);

  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body."
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
      message: "Invalid ID or field value."
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
// 10. DATABASE CONNECTION
// ============================================

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start application:", error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, Author, Category, Book, startServer };
