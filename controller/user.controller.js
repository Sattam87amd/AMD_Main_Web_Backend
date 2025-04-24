import twilio from "twilio";
import jwt from "jsonwebtoken";  // Added JWT
import { User } from "../model/user.model.js";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../middleware/multer.middleware.js";
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ✅ Twilio client setup
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ Helper function: Normalize phone number
const normalizePhoneNumber = (phone) => phone.replace(/[^\d]/g, "");

// ✅ Helper function: Send OTP via SMS
const sendOtpToPhone = async (phone) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit OTP
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

// ✅ Helper function: Send OTP via Email
const sendOtpToEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"Your App" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP is: <b>${otp}</b></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to email: ${email}`);
  } catch (error) {
    console.error("Error sending OTP via Email:", error);
    throw new ApiError(500, "Failed to send OTP via email");
  }
};

// ✅ Request OTP (Sends OTP and stores it in the database)
const requestOtp = asyncHandler(async (req, res) => {
  const { phone, email } = req.body;

  if (!phone && !email) throw new ApiError(400, "Phone number or email is required");

  let otp;
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes
  let user;

  // Generate OTP once
  otp = Math.floor(1000 + Math.random() * 9000).toString();

  if (phone) {
    // Phone-based OTP
    const normalizedPhone = normalizePhoneNumber(phone);
    user = await User.findOne({ phone: normalizedPhone });

    if (user) {
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
      // Send OTP via SMS
      await sendOtpToPhone(phone, otp);
      return res.status(200).json(new ApiResponse(200, { isNewUser: false }, "OTP sent successfully via phone"));
    } else {
      user = new User({ phone: normalizedPhone, otp, otpExpires, role: "user" });
      await user.save();
      // Send OTP via SMS
      await sendOtpToPhone(phone, otp);
      return res.status(200).json(new ApiResponse(200, { isNewUser: true }, "User not found, please proceed with registration"));
    }
  }

  if (email) {
    // Email-based OTP
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      await existingUser.save();
      // Send OTP via Email
      await sendOtpToEmail(email, otp);
      return res.status(200).json(new ApiResponse(200, { isNewUser: false }, "OTP sent successfully via email"));
    } else {
      user = new User({ email, otp, otpExpires, role: "user" });
      await user.save();
      // Send OTP via Email
      await sendOtpToEmail(email, otp);
      return res.status(200).json(new ApiResponse(200, { isNewUser: true }, "User not found, please proceed with registration"));
    }
  }
});


// ✅ Verify OTP (Checks OTP and logs in/registers the user)
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, email, otp, firstName, lastName } = req.body;
  if (!phone && !email || !otp) throw new ApiError(400, "Phone or Email and OTP are required");

  let user;
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;

  if (phone) {
    user = await User.findOne({ phone: normalizedPhone });
  } else if (email) {
    user = await User.findOne({ email });
  }

  if (!user || user.otp !== otp || new Date() > user.otpExpires) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  // If the user doesn't exist or has incomplete information, proceed with registration
  if (!user.firstName || !user.lastName) {
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    await user.save();

    // Do not generate the token here for new users
    return res.status(200).json(new ApiResponse(200, { isNewUser: true }, "OTP verified, registration completed"));
  }

  // Generate a token only for existing users (not for new users)
  const token = jwt.sign(
    { _id: user._id, phone: user.phone, email: user.email, role: "user" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return res.status(200).json(new ApiResponse(200, { isNewUser: false, token }, "OTP verified, login successful"));
});


// ✅ Register User (Creates a user after OTP verification)
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone } = req.body;

  if (!firstName || !lastName || !email) {
    throw new ApiError(400, "First name, last name, and email are required");
  }

  const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;

  // Check if a user already exists with the same email or phone
  const existingUser = await User.findOne({
    $or: [
      { email },
      ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
    ]
  });

  let user;

  if (existingUser) {
    // Update existing user
    existingUser.firstName = firstName;
    existingUser.lastName = lastName;
    existingUser.email = email;
    if (normalizedPhone) existingUser.phone = normalizedPhone;

    user = await existingUser.save();
  } else {
    // Create new user
    user = await User.create({
      firstName,
      lastName,
      email,
      phone: normalizedPhone
    });
  }

  return res.status(201).json(
    new ApiResponse(201, { message: "User registered successfully" })
  );
});

const getUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find();  // Fetch all users from the database
    res.status(200).json(new ApiResponse(200, users, "Users retrieved successfully"));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching users.",
      error: error.message,
    });
  }
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

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const objectId = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(objectId);
  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json(new ApiResponse(200, user, "User retrieved"));
});

const uploadPhoto = asyncHandler(async (req, res) => {
  try {
    let photoUrl = null;
    const userId = req.params.id;

    if (req.files && req.files.photoFile && req.files.photoFile[0]) {
      const photoFile = req.files.photoFile[0];
      const photoResult = await uploadToCloudinary(photoFile, 'user/photos');
      photoUrl = photoResult.secure_url;
    }

    const user = await User.findByIdAndUpdate(userId, { photoFile: photoUrl }, { new: true });
    res.status(200).json(new ApiResponse(200, user, "Photo uploaded successfully"));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

export { requestOtp, verifyOtp, registerUser, getUserProfile, getUserById, uploadPhoto, getUsers};
