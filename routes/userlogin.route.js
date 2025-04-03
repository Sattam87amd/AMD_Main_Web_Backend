import express from 'express';
import { requestOtp, verifyOtp } from '../controller/userlogin.controller.js';

const userrouter = express.Router();

// Request OTP
userrouter.post('/request-otp', requestOtp);

// Verify OTP
userrouter.post('/verify-otp', verifyOtp);

export default userrouter;
