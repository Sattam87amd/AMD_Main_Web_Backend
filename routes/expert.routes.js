import express from "express";
import upload from "../middleware/multer.middleware.js";
import VerifyJwt from "../middleware/auth.middleware.js";
import {
  createExpert,
  getExperts,
  getExpertById,
  requestOtp,
  verifyOtp,
  registerExpert
} from "../controller/expert.Controller.js";

const expertrouter = express.Router();

// Public Routes
expertrouter.post("/request-otp", requestOtp);
expertrouter.post("/verify-otp", verifyOtp);
expertrouter.post("/register", registerExpert);

// Protected Routes
expertrouter.use(VerifyJwt);
expertrouter.post("/create", 
  upload.fields([
    { name: "certification", maxCount: 1 },
    { name: "photo", maxCount: 1 }
  ]), 
  createExpert
);
expertrouter.get("/all", getExperts);
expertrouter.get("/:id", getExpertById);

export default expertrouter;