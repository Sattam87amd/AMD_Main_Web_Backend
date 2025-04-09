import express from "express";
import multer from 'multer';
//import upload from "../middleware/multer.middleware.js";
import VerifyJwt from "../middleware/auth.middleware.js";
import {
  requestOtp,
  verifyOtp,
  registerExpert,
  getExpertById,
  getExpertsByArea
} from "../controller/expert.controller.js";

const expertrouter = express.Router();

// Public Routes
expertrouter.post("/request-otp", requestOtp);
expertrouter.post("/verify-otp", verifyOtp);

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Use upload.fields to handle multiple file fields
expertrouter.post(
  '/register',
  upload.fields([
    { name: 'photoFile', maxCount: 1 },
    { name: 'certificationFile', maxCount: 1 }
  ]),
  registerExpert
);
// Protected Routes

expertrouter.get("/:id", getExpertById);
expertrouter.get("/area/:area", getExpertsByArea)

export default expertrouter;