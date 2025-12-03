// Authentication Routes
// Defines authentication endpoints

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validateLogin } = require("../middleware/validation");

// Public routes
router.post("/login", validateLogin, authController.login);
router.post("/refresh", authController.refresh);

// Protected routes
router.get("/me", authenticate, authController.getCurrentUser);
router.post("/change-password", authenticate, authController.changePassword);
router.post("/logout", authenticate, authController.logout);

module.exports = router;
