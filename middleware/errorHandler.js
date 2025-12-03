// Global Error Handler Middleware
// Catches and formats all errors in a consistent way

/**
 * Global error handler
 * Must be used as the last middleware
 */
function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors = err.errors || null;

  // Prisma errors
  if (err.code && err.code.startsWith("P")) {
    const prismaError = handlePrismaError(err);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired";
  }

  // Validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = err.errors;
  }

  // Multer file upload errors
  if (err.name === "MulterError") {
    statusCode = 400;
    message = handleMulterError(err);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      error: err,
    }),
  });
}

/**
 * Handle Prisma database errors
 */
function handlePrismaError(err) {
  const errors = {
    // Unique constraint violation
    P2002: {
      statusCode: 409,
      message: `A record with this ${
        err.meta?.target?.[0] || "field"
      } already exists`,
    },
    // Record not found
    P2025: {
      statusCode: 404,
      message: "Record not found",
    },
    // Foreign key constraint violation
    P2003: {
      statusCode: 400,
      message: "Invalid reference to related record",
    },
    // Required field missing
    P2011: {
      statusCode: 400,
      message: `Required field ${err.meta?.constraint} is missing`,
    },
    // Record to delete does not exist
    P2018: {
      statusCode: 404,
      message: "Record to delete does not exist",
    },
    // Connection error
    P1001: {
      statusCode: 503,
      message: "Cannot reach database server",
    },
    // Connection timeout
    P1008: {
      statusCode: 503,
      message: "Database connection timeout",
    },
  };

  return (
    errors[err.code] || {
      statusCode: 500,
      message: "Database error occurred",
    }
  );
}

/**
 * Handle Multer file upload errors
 */
function handleMulterError(err) {
  const errors = {
    LIMIT_FILE_SIZE: "File size exceeds the maximum allowed limit",
    LIMIT_FILE_COUNT: "Too many files uploaded",
    LIMIT_UNEXPECTED_FILE: "Unexpected file field",
    LIMIT_FIELD_KEY: "Field name is too long",
    LIMIT_FIELD_VALUE: "Field value is too long",
    LIMIT_FIELD_COUNT: "Too many fields",
    LIMIT_PART_COUNT: "Too many parts",
  };

  return errors[err.code] || "File upload error";
}

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found error (404)
 */
function notFound(message = "Resource not found") {
  return new AppError(message, 404);
}

/**
 * Unauthorized error (401)
 */
function unauthorized(message = "Authentication required") {
  return new AppError(message, 401);
}

/**
 * Forbidden error (403)
 */
function forbidden(message = "Access forbidden") {
  return new AppError(message, 403);
}

/**
 * Bad request error (400)
 */
function badRequest(message = "Bad request", errors = null) {
  return new AppError(message, 400, errors);
}

/**
 * Conflict error (409)
 */
function conflict(message = "Resource conflict") {
  return new AppError(message, 409);
}

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  conflict,
};
