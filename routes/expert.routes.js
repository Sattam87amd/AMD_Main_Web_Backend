import express from "express";
import upload from "../middleware/multer.middleware.js";
import VerifyJwt from "../middleware/auth.middleware.js";
import {
  requestOtp,
  verifyOtp,
  registerExpert,
  getExpertById
} from "../controller/expert.controller.js";

const expertrouter = express.Router();

// Public Routes
expertrouter.post("/request-otp", requestOtp);
expertrouter.post("/verify-otp", verifyOtp);
expertrouter.post("/register", registerExpert);

// Protected Routes

// expertrouter.post("/create", 
//   upload.fields([
//     { name: "certification", maxCount: 1 },
//     { name: "photo", maxCount: 1 }
//   ]), 
//   createExpert
// );

expertrouter.get("/:id", getExpertById);

export default expertrouter;