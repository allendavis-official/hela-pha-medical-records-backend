// Main Express Server - Hela PHA Medical Records Platform
// Entry point for the backend API

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

// Import configurations
const { connectDatabase } = require("./config/database");

// Import middleware
const { errorHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/audit");

// Import routes
const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patients.routes");
const encounterRoutes = require("./routes/encounters.routes");
const clinicalNoteRoutes = require("./routes/clinicalNotes.routes");
const orderRoutes = require("./routes/orders.routes");
const resultRoutes = require("./routes/results.routes");
const recordRoutes = require("./routes/records.routes");
const kpiRoutes = require("./routes/kpi.routes");
const dataQualityRoutes = require("./routes/dataQuality.routes");
const userRoutes = require("./routes/users.routes");
const departmentRoutes = require("./routes/departments.routes");
const roleRoutes = require("./routes/roles.routes");

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// CORS configuration
app.use(
  cors({
    origin: [
      "https://hela-pha-medical-records-frontend.vercel.app", // Production
      "https://hela-pha-medical-records-frontend-6irlb8ora.vercel.app", // Current deployment
      "https://hela-pha-medical-records-frontend-*.vercel.app", // All Vercel previews
      "http://localhost:3000", // Local dev
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Content-Length"],
    maxAge: 86400,
  })
);

// Handle preflight
app.options("*", cors());

// Security headers
app.use(helmet());

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression
app.use(compression());

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Audit logging middleware
app.use(requestLogger);

// ============================================
// HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hela PHA Medical Records API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================
// API ROUTES
// ============================================

const API_PREFIX = "/api";

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/patients`, patientRoutes);
app.use(`${API_PREFIX}/encounters`, encounterRoutes);
app.use(`${API_PREFIX}/clinical-notes`, clinicalNoteRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/results`, resultRoutes);
app.use(`${API_PREFIX}/records`, recordRoutes);
app.use(`${API_PREFIX}/kpi`, kpiRoutes);
app.use(`${API_PREFIX}/data-quality`, dataQualityRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/departments`, departmentRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// ============================================
// ERROR HANDLER (Must be last)
// ============================================

app.use(errorHandler);

// ============================================
// SERVER INITIALIZATION
// ============================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.log("✅ Database connected successfully");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 API Base URL: http://localhost:${PORT}${API_PREFIX}`);
      console.log(`🏥 Environment: ${process.env.NODE_ENV || "development"}\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
