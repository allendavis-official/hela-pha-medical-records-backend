// S3 Storage Configuration
// Handles file uploads to S3-compatible storage

const AWS = require("aws-sdk");

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT, // For S3-compatible services (MinIO, DigitalOcean Spaces)
  s3ForcePathStyle: !!process.env.S3_ENDPOINT, // Required for MinIO
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "hela-pha-records";

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} mimeType - File MIME type
 * @param {string} folder - Folder path in bucket
 * @returns {Promise<Object>} Upload result with file URL
 */
async function uploadFile(fileBuffer, fileName, mimeType, folder = "records") {
  const key = `${folder}/${Date.now()}-${fileName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: "private", // Files are private by default
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      success: true,
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Generate presigned URL for secure file download
 * @param {string} fileKey - S3 file key
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
async function getPresignedUrl(fileKey, expiresIn = 3600) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Expires: expiresIn,
  };

  try {
    const url = await s3.getSignedUrlPromise("getObject", params);
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

/**
 * Delete file from S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<boolean>} Success status
 */
async function deleteFile(fileKey) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
  };

  try {
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error("S3 delete error:", error);
    throw new Error(`File deletion failed: ${error.message}`);
  }
}

/**
 * Check if file exists in S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<boolean>} Exists status
 */
async function fileExists(fileKey) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
  };

  try {
    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === "NotFound") {
      return false;
    }
    throw error;
  }
}

/**
 * List files in a folder
 * @param {string} folder - Folder path
 * @returns {Promise<Array>} List of files
 */
async function listFiles(folder) {
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: folder,
  };

  try {
    const result = await s3.listObjectsV2(params).promise();
    return result.Contents || [];
  } catch (error) {
    console.error("S3 list error:", error);
    throw new Error("Failed to list files");
  }
}

module.exports = {
  s3,
  uploadFile,
  getPresignedUrl,
  deleteFile,
  fileExists,
  listFiles,
  BUCKET_NAME,
};
