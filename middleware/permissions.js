// Role-Based Access Control (RBAC) Middleware
// Enforces permission rules based on user roles

/**
 * Check if user has required role
 * @param {Array<string>} allowedRoles - Array of role names that can access
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
        requiredRole: allowedRoles,
        yourRole: req.user.roleName,
      });
    }

    next();
  };
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  return requireRole(["admin"])(req, res, next);
}

/**
 * Require clinician role (doctors, nurses)
 */
function requireClinician(req, res, next) {
  return requireRole(["admin", "clinician"])(req, res, next);
}

/**
 * Require records staff role
 */
function requireRecordsStaff(req, res, next) {
  return requireRole(["admin", "records_staff"])(req, res, next);
}

/**
 * Require lab technician role
 */
function requireLabTech(req, res, next) {
  return requireRole(["admin", "clinician", "lab_tech"])(req, res, next);
}

/**
 * Require radiographer role
 */
function requireRadiographer(req, res, next) {
  return requireRole(["admin", "clinician", "radiographer"])(req, res, next);
}

/**
 * Require data manager role
 */
function requireDataManager(req, res, next) {
  return requireRole(["admin", "data_manager"])(req, res, next);
}

/**
 * Allow multiple roles (OR logic)
 * @param {Array<string>} roles - Allowed roles
 */
function allowRoles(...roles) {
  return requireRole(roles);
}

/**
 * Check if user owns the resource or is admin
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 */
function requireOwnershipOrAdmin(getResourceOwnerId) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Admins can access everything
    if (req.user.roleName === "admin") {
      return next();
    }

    try {
      const ownerId = await getResourceOwnerId(req);

      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own resources",
        });
      }

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
  };
}

/**
 * Permission matrix for different modules
 * Based on PRD requirements
 */
const PERMISSIONS = {
  // Patient Registration
  patient: {
    create: ["admin", "records_staff", "clinician"],
    read: [
      "admin",
      "records_staff",
      "clinician",
      "lab_tech",
      "radiographer",
      "data_manager",
    ],
    update: ["admin", "records_staff", "clinician"],
    delete: ["admin"],
  },

  // Encounters
  encounter: {
    create: ["admin", "records_staff", "clinician"],
    read: ["admin", "records_staff", "clinician", "lab_tech", "radiographer"],
    update: ["admin", "clinician"],
    delete: ["admin"],
    close: ["admin", "clinician"],
  },

  // Clinical Notes
  clinicalNote: {
    create: ["admin", "clinician"],
    read: ["admin", "clinician"],
    update: ["admin", "clinician"],
    delete: ["admin"],
  },

  // Lab Orders & Results
  labOrder: {
    create: ["admin", "clinician"],
    read: ["admin", "clinician", "lab_tech"],
    update: ["admin", "lab_tech"],
    delete: ["admin"],
  },

  // Radiology Orders & Results
  radiologyOrder: {
    create: ["admin", "clinician"],
    read: ["admin", "clinician", "radiographer"],
    update: ["admin", "radiographer"],
    delete: ["admin"],
  },

  // Records/Files
  record: {
    create: ["admin", "records_staff"],
    read: ["admin", "records_staff", "clinician"],
    update: ["admin", "records_staff"],
    delete: ["admin"],
  },

  // KPIs/Dashboard
  kpi: {
    read: [
      "admin",
      "records_staff",
      "clinician",
      "lab_tech",
      "radiographer",
      "data_manager",
      "viewer",
    ],
  },

  // Data Quality
  dataQuality: {
    create: ["admin", "data_manager"],
    read: ["admin", "data_manager"],
    update: ["admin", "data_manager"],
    delete: ["admin"],
  },

  // User Management
  user: {
    create: ["admin"],
    read: ["admin"],
    update: ["admin"],
    delete: ["admin"],
  },
};

/**
 * Check permission for a specific action on a resource
 * @param {string} resource - Resource type (e.g., 'patient', 'encounter')
 * @param {string} action - Action type (e.g., 'create', 'read', 'update', 'delete')
 */
function checkPermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const allowedRoles = PERMISSIONS[resource]?.[action];

    if (!allowedRoles) {
      return res.status(500).json({
        success: false,
        message: "Invalid permission configuration",
      });
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${action} ${resource}`,
        requiredRoles: allowedRoles,
        yourRole: req.user.roleName,
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireAdmin,
  requireClinician,
  requireRecordsStaff,
  requireLabTech,
  requireRadiographer,
  requireDataManager,
  allowRoles,
  requireOwnershipOrAdmin,
  checkPermission,
  PERMISSIONS,
};
