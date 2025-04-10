import twilio from "twilio";
import jwt from "jsonwebtoken";  // Added JWT
import { User } from "../model/user.model.js";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import {uploadToCloudinary } from "../middleware/multer.middleware.js";
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

  // ✅ Check if the user exists
  let user = await User.findOne({ phone: normalizedPhone });

  if (user) {
    // User exists, send OTP for verification
    const otp = await sendOtp(phone);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Update the user's OTP and expiration
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save(); // Save OTP details in the DB

    return res.status(200).json(
      new ApiResponse(200, { isNewUser: false }, "OTP sent successfully")
    );
  } else {
    // User doesn't exist, proceed with registration, but also send OTP
    const otp = await sendOtp(phone);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Create a new user with OTP (registration will be completed later)
    user = new User({ phone: normalizedPhone, otp, otpExpires, role: "user" });
    await user.save(); // Save new user with OTP

    return res.status(200).json(
      new ApiResponse(200, { isNewUser: true }, "User not found, please proceed with registration")
    );
  }
});


// ✅ Verify OTP (Checks OTP and logs in/registers the user)
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, firstName, lastName, email } = req.body; // Only firstName, lastName, and email for registration
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

  // If the user doesn't exist or has incomplete information, proceed with registration
  if (!user.firstName) {
    // Only update firstName, lastName, and email
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;

    await user.save(); // Save the registration details

    // Generate a JWT token for the newly registered user
    const token = jwt.sign(
      { _id: user._id, phone: user.phone, role: "user" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json(
      new ApiResponse(200, { isNewUser: true, token }, "OTP verified, registration completed")
    );
  }

  // If the user is existing and has a complete registration, generate the token
  const token = jwt.sign(
    { _id: user._id, phone: user.phone, role: "user" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return res.status(200).json(
    new ApiResponse(200, { isNewUser: false, token }, "OTP verified, login successful")
  );
});



// ✅ Register User (Creates a user after OTP verification)
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone} = req.body;
  if (!firstName || !lastName || !email || !phone) {
    throw new ApiError(400, "All fields are required");
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  let user = await User.findOne({ phone: normalizedPhone });

  if (!user) throw new ApiError(400, "OTP verification required before registration");

  user.firstName = firstName;
  user.lastName = lastName;
  user.email = email;
  await user.save();

 

  return res.status(201).json(
    new ApiResponse(201, { message: "User registered successfully" })
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

const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Log the userId to check its value
  console.log("Received userId:", userId);
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }
  

  // Convert userId to ObjectId after validation
  const objectId = new mongoose.Types.ObjectId(userId);

  const user = await User.findById(objectId);
  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json(new ApiResponse(200, user, "User retrieved"));
});

const uploadPhoto =  asyncHandler(async (req, res) =>{ try {
  let photoUrl = null;
  const userId = req.params.id;


    // If photo file is provided
    if (req.files && req.files.photoFile && req.files.photoFile[0]) {
      const photoFile = req.files.photoFile[0];
      const photoResult = await uploadToCloudinary(photoFile, 'user/photos');
      photoUrl = photoResult.secure_url;
    }

    const user = await User.findByIdAndUpdate(userId, { photoFile: photoUrl }, { new: true });

} catch (error) {
  console.error(error);
  res.status(500).json({ message: 'Internal Server Error', error: error.message });
}
});

export { requestOtp, verifyOtp, registerUser, getUserProfile, getUserById, uploadPhoto };  // Export the new function

