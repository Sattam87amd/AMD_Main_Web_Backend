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

const router = express.Router();

// Public Routes
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Use upload.fields to handle multiple file fields
router.post(
  '/register',
  upload.fields([
    { name: 'photoFile', maxCount: 1 },
    { name: 'certificationFile', maxCount: 1 }
  ]),
  registerExpert
);
// Protected Routes

router.get("/:id", getExpertById);
router.get("/area/:area", getExpertsByArea)

export default router;