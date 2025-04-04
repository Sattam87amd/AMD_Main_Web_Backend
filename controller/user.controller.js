import twilio from "twilio";
import jwt from "jsonwebtoken";  // Added JWT
import { User } from "../model/user.Model.js";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

dotenv.config();

// Twilio client setup
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper function: Normalize phone number
const normalizePhoneNumber = (phone) => phone.replace(/[^\d]/g, "");

// Helper function: Send OTP via SMS
const sendOtp = async (phone) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to ${phone}`);
    return otp;
  } catch (error) {
    console.error("Error sending OTP via Twilio:", error);
    throw new ApiError(500, "Failed to send OTP");
  }
};

// 📌 Request OTP (Login Only)
const requestOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ApiError(400, "Phone number is required");
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  // Check if user exists
  let user = await User.findOne({ mobileNumber: normalizedPhone });

  // Generate OTP
  const otp = await sendOtp(phone);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 mins

  // Store OTP in the User model
  user = await User.findOneAndUpdate(
    { mobileNumber: normalizedPhone },
    { otp, otpExpires },
    { upsert: true, new: true, runValidators: true }
  );

  return res.status(200).json(
    new ApiResponse(200, { isNewUser: !user.fullname }, "OTP sent successfully")
  );
});

// 📌 Verify OTP (Login & Generate Token)
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ApiError(400, "Phone and OTP are required");
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  let user = await User.findOne({ mobileNumber: normalizedPhone });

  if (!user || user.otp !== otp || user.otpExpires < new Date()) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Remove OTP after successful verification
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  // ✅ Generate JWT Token
  const token = jwt.sign(
    { _id: user._id, mobileNumber: user.mobileNumber },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" } // Token expires in 7 days
  );

  return res.status(200).json(
    new ApiResponse(200, { isNewUser: !user.fullname, token }, "OTP verified successfully")
  );
});


// 📌 Store User Information
const storeUserInfo = asyncHandler(async (req, res) => {
  const { firstname, lastname, email } = req.body;

  if (!firstname || !lastname || !email) {
    throw new ApiError(400, "Firstname, lastname, and email are required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Update user details
  user.firstname = firstname;
  user.lastname = lastname;
  user.email = email;

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user, "User information stored successfully")
  );
});





// 📌 Get Current User (Protected Route)
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("fullname lastname email mobileNumber");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

// 📌 Update User Profile (Protected Route)
const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullname, lastname, email } = req.body;

  if (!fullname || !lastname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { fullname, lastname, email },
    { new: true, select: "fullname lastname email" }
  );

  return res.status(200).json(new ApiResponse(200, user, "Profile updated successfully"));
});


const userdetail = asyncHandler(async (req, res) => {
  const { firstname, lastname, email } = req.body;

  // Validation
  if (!firstname || !lastname || !email) {
    res.status(400);
    throw new Error("All fields are required: firstname, lastname, email");
  }

  // Email validation
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      res.status(409); // Conflict status code
      throw new Error("User with this email already exists");
    }

    // Create new user
    const user = await User.create({
      firstname,
      lastname,
      email
    });

    // Optionally omit sensitive data from response
    const userResponse = {
      _id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse
    });
    
  } catch (error) {
    // Handle duplicate key error (unique email)
    if (error.code === 11000) {
      res.status(409);
      throw new Error("Email already in use");
    }
    // Handle other errors
    res.status(error.statusCode || 500);
    throw new Error(error.message || "Failed to create user");
  }
});


export { requestOtp, verifyOtp, getCurrentUser, updateUserProfile ,userdetail};
