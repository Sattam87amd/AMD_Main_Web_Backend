import twilio from "twilio";
import jwt from "jsonwebtoken";  // Added JWT
import { User } from "../model/user.model.js";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

dotenv.config();

// ✅ Twilio client setup
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ Helper function: Normalize phone number
const normalizePhoneNumber = (phone) => phone.replace(/[^\d]/g, "");

// ✅ Helper function: Send OTP via SMS
const sendOtp = async (phone) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit OTP
    await client.messages.create({
      body: `Your verification code is: ${otp}`, // ✅ Fixed string interpolation
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to ${phone}`); // ✅ Fixed console log
    return otp;
  } catch (error) {
    console.error("Error sending OTP via Twilio:", error);
    throw new ApiError(500, "Failed to send OTP");
  }
};

// ✅ Request OTP (Sends OTP and stores it in the database)
const requestOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new ApiError(400, "Phone number is required");

  const normalizedPhone = normalizePhoneNumber(phone);

  // Generate and send OTP
  const otp = await sendOtp(phone);
  if (!otp) throw new ApiError(500, "Failed to generate OTP");

  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

  // ✅ Check if the user exists
  let user = await User.findOne({ phone: normalizedPhone });

  if (user) {
    // Update existing user's OTP
    user.otp = otp;
    user.otpExpires = otpExpires;
  } else {
    // Create a new user with OTP (registration will be completed later)
    user = new User({ phone: normalizedPhone, otp, otpExpires, role: "user" });
  }

  await user.save(); // ✅ Save user in DB

  return res.status(200).json(
    new ApiResponse(200, { isNewUser: !user.fullname }, "OTP sent successfully")
  );
});

// ✅ Verify OTP (Checks OTP and logs in/registers the user)
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) throw new ApiError(400, "Phone and OTP are required");

  const normalizedPhone = normalizePhoneNumber(phone);
  let user = await User.findOne({ phone: normalizedPhone });

  if (!user || user.otp !== otp || new Date() > user.otpExpires) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Reset OTP after successful verification
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  // Check if user has completed registration (has fullname)
  if (!user.fullname) {
    return res.status(200).json(
      new ApiResponse(200, { isNewUser: true }, "OTP verified, proceed to registration")
    );
  }

  // Generate JWT token after OTP verification
  const token = jwt.sign(
    { _id: user._id, phone: user.phone, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return res.status(200).json(
    new ApiResponse(200, { isNewUser: false, token }, "OTP verified successfully")
  );
});

// ✅ Register User (Creates a user after OTP verification)
const registerUser = asyncHandler(async (req, res) => {
  const { lastname, fullname, email, phone } = req.body;
  if (!lastname || !fullname || !email || !phone) {
    throw new ApiError(400, "All fields are required");
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  let user = await User.findOne({ phone: normalizedPhone });

  if (!user) throw new ApiError(400, "OTP verification required before registration");

  user.fullname = fullname;
  user.lastname = lastname;
  user.email = email;
  await user.save();

  // Generate JWT token after successful registration
  const token = jwt.sign(
    { _id: user._id, phone: user.phone, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return res.status(201).json(
    new ApiResponse(201, { message: "User registered successfully", token })
  );
});

// ✅ Get User Profile (Fetch user details by ID)
const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params; // Get user ID from URL parameters
  let user = await User.findById(id); // Fetch user details from database

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Send user data as response
  return res.status(200).json(
    new ApiResponse(200, { user }, "User profile fetched successfully")
  );
});

export { requestOtp, verifyOtp, registerUser, getUserProfile };  // Export the new function

