// // import { Admin } from '../model/admin.model.js';
// import bcrypt from 'bcryptjs';

// // Admin Login
// export const adminLogin = async (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         return res.status(400).json({ message: 'All fields are required' });
//     }

//     try {
//         const admin = await AdminLogin.findOne({ email });
//         if (!admin) {
//             return res.status(400).json({ message: 'Invalid email or password' });
//         }

//         const isMatch = await bcrypt.compare(password, admin.password);
//         if (!isMatch) {
//             return res.status(400).json({ message: 'Invalid email or password' });
//         }

//         res.status(200).json({ message: 'Login successful' });
//     } catch (error) {
//         res.status(500).json({ message: 'Server Error', error });
//     }
// };



import jwt from "jsonwebtoken";
import { Admin } from "../model/admin.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
// import bcrypt from "bcrypt";

// 📌 Admin Login (Verify email and password)
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Check if admin exists
  let admin = await Admin.findOne({ email });

  if (!admin) {
    throw new ApiError(400, "Invalid email or password");
  }

  // Compare password with hashed password
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new ApiError(400, "Invalid email or password");
  }

  // ✅ Generate JWT Token
  const token = jwt.sign(
    { _id: admin._id, email: admin.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" } // Token expires in 7 days
  );

  return res.status(200).json(
    new ApiResponse(200, { token }, "Admin login successful")
  );
});

// 📌 Get Admin Details (Protected Route)
const getAdminDetails = asyncHandler(async (req, res) => {
  const admin = await AdminLogin.findById(req.admin._id).select("email");

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  return res.status(200).json(new ApiResponse(200, admin, "Admin fetched successfully"));
});

// 📌 Update Admin Profile (Protected Route)
const updateAdminProfile = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const admin = await Admin.findByIdAndUpdate(
    req.admin._id,
    { email, password },
    { new: true, select: "email" }
  ); 

  return res.status(200).json(new ApiResponse(200, admin, "Admin profile updated successfully"));
});

export { adminLogin, getAdminDetails, updateAdminProfile };
