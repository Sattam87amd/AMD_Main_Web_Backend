import multer from 'multer';
import path from 'path';
import streamifier from 'streamifier';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();
// Set up Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');  // Define the uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);  // Unique file name based on timestamp
  },
});

// Initialize Multer with the storage configuration
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif|pdf/;  // Allowed file types
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(new Error('Only image and document files are allowed'));
    }
  },
}).fields([
  { name: 'photoFile', maxCount: 1 },  // Photo file
  { name: 'certificationFile', maxCount: 1 },  // Certification file
]);



cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, //|| 'dctmzawgj',
  api_key: process.env.CLOUDINARY_API_KEY,// || '517938482585331',
  api_secret: process.env.CLOUDINARY_API_SECRET,// || 'i6XCN0_E4JGeoTSJQU5uK0c9odw'
});

// Helper function to upload a file buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, folder, resource_type = 'image') => {
  return new Promise((resolve, reject) => {
    // Check the file type (MIME type)
    if (resource_type === 'image') {
      const mimeType = fileBuffer.mimetype;
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(mimeType)) {
        return reject(new Error("Invalid image file"));
      }
    }

    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder, resource_type: 'auto',
        transformation: [
          { width: 800, height: 800, crop: 'limit' } ]
       },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer.buffer).pipe(uploadStream);
  });
};


export {upload, uploadToCloudinary} ;
