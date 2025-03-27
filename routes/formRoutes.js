import express from "express";
import upload from "../middleware/upload.js";
import { createUser, getUsers, getUserById} from "../controller/formController.js";

const router = express.Router();

// Route to create a new user (with PDF upload)
router.post("/create", upload.single("certificate"), createUser);

// Route to get all users
router.get("/all", getUsers);

// Route to get a user by ID
router.get("/:id", getUserById);

export default router;
