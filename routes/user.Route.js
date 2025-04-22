import { Router } from 'express';
import { requestOtp, uploadPhoto, verifyOtp, registerUser, getUserById, getUsers } from '../controller/user.controller.js'; // Import the getUsers controller
import VerifyJwt from '../middleware/auth.middleware.js';
import multer from 'multer';
const router = Router();

// Public Routes
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to fetch all users
router.get('/users', getUsers);  // Add this route for fetching all users

// Other routes
router.post('/uploadProfileImage/:id', upload.fields([
  { name: 'photoFile', maxCount: 1 },
]), uploadPhoto);

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/registeruser', registerUser);

router.get("/:id", getUserById);

export default router;
