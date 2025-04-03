import express from "express";
import upload from "../middleware/expertupload.middleware.js";
import { createUser, getUsers, getUserById } from "../controller/formController.js";

const router = express.Router();

// Route to create a new user (with file uploads)
router.post("/create", upload.fields([{ name: 'certificate', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), createUser);

// Route to get all users
router.get("/all", getUsers);

// Route to get a user by ID
router.get("/:id", getUserById);

export default router;
