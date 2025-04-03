import express from 'express';
import { requestOtp, verifyOtp, getCurrentUser, updateUserProfile,userdetail } from '../controller/user.controller.js';
import VerifyJwt from '../middleware/auth.middleware.js';

const userrouter = express.Router();

// Public Routes
userrouter.post('/request-otp', requestOtp);
userrouter.post('/verify-otp', verifyOtp);

// 🔐 Protected Routes (Require JWT Token)
userrouter.get('/getinfo', VerifyJwt, getCurrentUser);
userrouter.put('/update', VerifyJwt, updateUserProfile);
userrouter.post('/store', userdetail);

export default userrouter;
