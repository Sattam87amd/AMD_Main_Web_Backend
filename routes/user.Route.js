import {Router} from 'express';
import { requestOtp,uploadPhoto, verifyOtp, registerUser, getUserById } from '../controller/user.controller.js';
import VerifyJwt from '../middleware/auth.middleware.js';
import multer from 'multer';
const router = Router();

// Public Routes
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Use upload.fields to handle multiple file fields


router.post('/uploadProfileImage/:id', upload.fields([
    { name: 'photoFile', maxCount: 1 },
  ]), uploadPhoto);
router.post('/request-otp', requestOtp);
router.post('/verify-otp' ,verifyOtp);
router.post('/registeruser',registerUser);


router.get("/:id", getUserById);




export default router;
