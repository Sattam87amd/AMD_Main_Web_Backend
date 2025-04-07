import { Expert } from "../model/expert.model.js";
import twilio from 'twilio';
import dotenv from 'dotenv';
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import upload from "../middleware/multer.middleware.js";
import { User } from "../model/user.model.js"; 


dotenv.config();
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper functions
const normalizePhoneNumber = (phone) => phone.replace(/[^\d]/g, "");
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

const requestOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new ApiError(400, "Phone number required");

  const normalizedPhone = normalizePhoneNumber(phone);

  // Check if number exists in user collection
  const existingUser = await User.findOne({ phone: normalizedPhone });
  if (existingUser) {
    throw new ApiError(400, "You've already registered as a user with this number");
  }

  // Check if number exists in expert collection
  let expert = await Expert.findOne({ phone: normalizedPhone });

  // If expert exists but isn't fully registered
  const isNewExpert = !expert?.email;

  // Generate and send OTP
  const otp = await sendOtp(phone);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  if (expert) {
    // Update existing expert record
    expert.otp = otp;
    expert.otpExpires = otpExpires;
  } else {
    // Create new expert record
    expert = new Expert({
      phone: normalizedPhone,
      otp,
      otpExpires,
      role: "expert",
      status:"Approve"
    });
  }

  await expert.save();

  res.status(200).json(
    new ApiResponse(200, { isNewExpert }, "OTP sent successfully")
  );
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) throw new ApiError(400, "Phone and OTP required");

  const normalizedPhone = normalizePhoneNumber(phone);
  const expert = await Expert.findOne({ phone: normalizedPhone });

  if (!expert || expert.otp !== otp || new Date() > expert.otpExpires) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  expert.otp = undefined;
  expert.otpExpires = undefined;
  await expert.save();

  // Check if the phone number already exists and if the expert has already completed registration
  if (expert.firstName && expert.lastName && expert.email) {
    // If expert has completed registration, return the token for login
    const token = jwt.sign(
      { _id: expert._id, phone: expert.phone, role: "expert" ,status:"Approve"},
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json(new ApiResponse(200, 
      { isNewExpert: false, token }, 
      "OTP verified - login successful"));
  }

  // If the expert does not have a full name and email, they need to complete the registration
  return res.status(200).json(new ApiResponse(200, 
    { isNewExpert: true }, 
    "OTP verified - complete registration"));
});


// Registration Controller
const registerExpert = asyncHandler(async (req, res) => {
  const { email, firstName, lastName, gender, phone } = req.body; // phone is still received but optional in frontend

  // Validate required fields (excluding phone)
  if (!firstName || !lastName || !email || !gender) {
    throw new ApiError(400, "All fields are required");
  }

  // Normalize and find expert by phone (which should be from OTP step)
  const normalizedPhone = normalizePhoneNumber(phone);
  const expert = await Expert.findOne({ phone: normalizedPhone });

  if (!expert) {
    throw new ApiError(400, "OTP verification required before registration");
  }

  // Optional: Prevent re-registration
  if (expert.email || expert.firstName || expert.lastName) {
    throw new ApiError(400, "Expert already registered.");
  }

  // Fill in registration details
  expert.firstName = firstName;
  expert.lastName = lastName;
  expert.email = email;
  expert.gender = gender;

  await expert.save();

  return res.status(201).json(
    new ApiResponse(201, { message: "Expert registered successfully" })
  );
});

// Expert Profile Controllers
const createExpert = asyncHandler(async (req, res) => {
  const { socialLink, areaOfExpertise, experience } = req.body;
  const files = req.files;
  
  if (!files?.certification?.[0] || !files?.photo?.[0]) {
    throw new ApiError(400, "Certification and photo required");
  }

  const expert = await Expert.findById(req.expert._id);
  if (!expert) throw new ApiError(404, "Expert not found");

  expert.socialLink = socialLink;
  expert.areaOfExpertise = areaOfExpertise;
  expert.experience = experience;
  expert.certificationFile = files.certification[0].path;
  expert.photoFile = files.photo[0].path;
  await expert.save();

  res.status(201).json(new ApiResponse(201, expert, "Profile completed"));
});

const logoutExpert = asyncHandler(async (req, res) => {
  await Expert.findByIdAndUpdate(
    req.expert._id,
    {
      $unset: {
        token: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("token", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const getExperts = asyncHandler(async (req, res) => {
  const experts = await Expert.find();
  res.status(200).json(new ApiResponse(200, experts, "Experts retrieved"));
});

const getExpertById = asyncHandler(async (req, res) => {
  const expert = await Expert.findById(req.params.id);
  if (!expert) throw new ApiError(404, "Expert not found");
  res.status(200).json(new ApiResponse(200, expert, "Expert retrieved"));
});

export {
requestOtp,
verifyOtp,
registerExpert,
createExpert,
getExperts,
getExpertById,
logoutExpert
};