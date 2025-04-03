import express from "express";
import upload from "../middleware/expertupload.middleware.js";
import { createExpert, getExperts, getExpertById } from "../controller/expertform.controller.js";

const router = express.Router();

// Route to create a new user (with file uploads)
router.post("/create", upload.fields([{ name: 'certificate', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), createExpert);

// Route to get all users
router.get("/all", getExperts);

// Route to get a user by ID
router.get("/:id", getExpertById);

export default router;
