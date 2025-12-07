const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary storage for users
const userStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hela-pha/users",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [
      { width: 500, height: 500, crop: "fill" },
      { quality: "auto" },
    ],
  },
});

// Configure Cloudinary storage for patients
const patientStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hela-pha/patients",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [
      { width: 500, height: 500, crop: "fill" },
      { quality: "auto" },
    ],
  },
});

// Create multer instances
const uploadUserImage = multer({
  storage: userStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

const uploadPatientImage = multer({
  storage: patientStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

module.exports = {
  uploadUserImage,
  uploadPatientImage,
};
