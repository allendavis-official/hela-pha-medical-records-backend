// Validation Middleware
// Uses express-validator for request validation

const { validationResult } = require("express-validator");

/**
 * Validate request and return errors if any
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
      })),
    });
  }

  next();
}

/**
 * Sanitize and validate common fields
 */
const { body, param, query } = require("express-validator");

// Common validation rules
const validationRules = {
  // Email validation
  email: body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid email address"),

  // Password validation
  password: body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  // UUID validation
  uuid: (field) =>
    param(field).isUUID().withMessage(`${field} must be a valid UUID`),

  // Required string
  requiredString: (field, minLength = 1) =>
    body(field)
      .trim()
      .isLength({ min: minLength })
      .withMessage(
        `${field} is required and must be at least ${minLength} character(s)`
      ),

  // Optional string
  optionalString: (field) => body(field).optional().trim(),

  // Date validation
  date: (field) =>
    body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid date`),

  // Phone number
  phone: (field) =>
    body(field)
      .optional()
      .trim()
      .matches(/^[+]?[\d\s()-]+$/)
      .withMessage(`${field} must be a valid phone number`),

  // Pagination
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
};

/**
 * Patient registration validation
 */
const validatePatientRegistration = [
  validationRules.requiredString("firstName"),
  validationRules.requiredString("lastName"),
  body("sex")
    .isIn(["male", "female", "other"])
    .withMessage("Sex must be male, female, or other"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date of birth"),
  body("ageEstimate")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Age estimate must be between 0 and 150"),
  validationRules.optionalString("phoneNumber"),
  validationRules.optionalString("address"),
  validate,
];

/**
 * Login validation
 */
const validateLogin = [
  validationRules.email,
  validationRules.requiredString("password"),
  validate,
];

/**
 * User creation validation
 */
// const validateUserCreation = [
//   validationRules.email,
//   validationRules.password,
//   validationRules.requiredString("firstName"),
//   validationRules.requiredString("lastName"),
//   body("roleId").isUUID().withMessage("Invalid role ID"),
//   validationRules.optionalString("phone"),
//   validate,
// ];

/**
 * Encounter creation validation
 */
const validateEncounterCreation = [
  body("patientId").isUUID().withMessage("Invalid patient ID"),
  body("departmentId").isUUID().withMessage("Invalid department ID"),
  body("encounterType")
    .isIn(["opd", "ipd", "emergency"])
    .withMessage("Encounter type must be opd, ipd, or emergency"),
  validationRules.optionalString("chiefComplaint"),
  validate,
];

/**
 * Clinical note validation
 */
const validateClinicalNote = [
  body("encounterId").isUUID().withMessage("Invalid encounter ID"),
  body("noteType")
    .isIn(["admission", "progress", "discharge"])
    .withMessage("Note type must be admission, progress, or discharge"),
  validationRules.requiredString("noteText"),
  body("vitals").optional().isObject().withMessage("Vitals must be an object"),
  validate,
];

/**
 * Order creation validation
 */
const validateOrderCreation = [
  body("encounterId").isUUID().withMessage("Invalid encounter ID"),
  body("orderType")
    .isIn(["lab", "radiology"])
    .withMessage("Order type must be lab or radiology"),
  validationRules.requiredString("testName"),
  body("priority")
    .optional()
    .isIn(["routine", "urgent", "stat"])
    .withMessage("Priority must be routine, urgent, or stat"),
  validate,
];

/**
 * Result entry validation
 */
const validateResultEntry = [
  body("orderId").isUUID().withMessage("Invalid order ID"),
  body("resultType")
    .isIn(["lab_result", "radiology_report"])
    .withMessage("Result type must be lab_result or radiology_report"),
  body("resultData")
    .optional()
    .isObject()
    .withMessage("Result data must be an object"),
  validate,
];

/**
 * Data quality issue validation
 */
const validateDataQualityIssue = [
  body("issueType")
    .isIn([
      "missing_data",
      "invalid_data",
      "duplicate_record",
      "incomplete_encounter",
    ])
    .withMessage("Invalid issue type"),
  body("severity")
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Severity must be low, medium, high, or critical"),
  validationRules.requiredString("entityType"),
  validationRules.requiredString("entityId"),
  validationRules.requiredString("description"),
  validate,
];

/**
 * Validate user creation
 */
function validateUserCreation(req, res, next) {
  const { email, password, firstName, lastName, roleId } = req.body;

  // Check required fields
  if (!email || !password || !firstName || !lastName || !roleId) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: email, password, firstName, lastName, roleId",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  // Validate name fields
  if (firstName.trim().length === 0 || lastName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "First name and last name cannot be empty",
    });
  }

  next();
}

/**
 * Validate user update
 */
async function validateUserUpdate(req, res, next) {
  const { email, firstName, lastName, roleId, phone } = req.body;

  // Only block if email is being CHANGED
  if (email !== undefined) {
    const { prisma } = require("../config/database");

    const currentUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { email: true },
    });

    // Only reject if email is different
    if (currentUser && email !== currentUser.email) {
      return res.status(400).json({
        success: false,
        message: "Email cannot be updated",
      });
    }
  }

  // Validate first name
  if (
    firstName !== undefined &&
    (!firstName || firstName.trim().length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "First name is required",
    });
  }

  // Validate last name
  if (lastName !== undefined && (!lastName || lastName.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      message: "Last name is required",
    });
  }

  next();
}

module.exports = {
  validate,
  validationRules,
  validatePatientRegistration,
  validateLogin,
  validateUserCreation,
  validateUserUpdate,
  validateEncounterCreation,
  validateClinicalNote,
  validateOrderCreation,
  validateResultEntry,
  validateDataQualityIssue,
};
