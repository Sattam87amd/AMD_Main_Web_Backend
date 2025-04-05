import {Router} from 'express';
import { requestOtp, verifyOtp, registerUser } from '../controller/user.controller.js';
import VerifyJwt from '../middleware/auth.middleware.js';

const router = Router();

// Public Routes
router.use(VerifyJwt)
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register',registerUser)



export default router;
