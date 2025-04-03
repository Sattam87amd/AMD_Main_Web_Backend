import express from "express";
import upload from "../middleware/multer.middleware.js";
import { createExpert,getExperts,getExpertById,requestOtp,verifyOtp,registerExpert, getAllExperts } from "../controller/expert.Controller.js"

const expertrouter = express.Router();

// --- Expert Form Routes ---
expertrouter.post("/create", upload.fields([{ name: 'certificate', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), createExpert);
expertrouter.get("/all", getExperts);
expertrouter.get("/:id", getExpertById);

// --- Expert Login Routes ---
expertrouter.post('/request-otp', requestOtp);
expertrouter.post('/verify-otp', verifyOtp);

// --- Expert Register Routes ---
expertrouter.post('/', registerExpert);
expertrouter.get('/', getAllExperts);

export default expertrouter;
