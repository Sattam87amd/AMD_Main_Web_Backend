import Expert from "../model/expert.model.js"; // Combined expert model
import ExpertLogin from "../model/expert.model.js"; // Combined login part of expert model
import ExpertRegister from "../model/expert.model.js"; // Combined registration part of expert model
import twilio from 'twilio';
import dotenv from 'dotenv';
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

// Twilio client
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Send OTP via SMS using Twilio API
const sendOtp = async (phone) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Twilio is used to send OTP, but we generate it here
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to ${phone}`);
    return otp; // Return the OTP generated for storage in the database
  } catch (error) {
    console.error('Error sending OTP via Twilio:', error);
    throw new Error('Failed to send OTP');
  }
};

// Normalize the phone number by removing non-numeric characters
const normalizePhoneNumber = (phone) => {
  return phone.replace(/[^\d]/g, ""); // This will remove all non-numeric characters
};

// --- Expert Form Controller ---
export const createExpert = async (req, res) => {
  try {
    const { firstName, lastName, email, gender, mobile, socialLink, areaOfExpertise, experience } = req.body;

    // Check if required files are uploaded
    if (!req.files || !req.files.certification || !req.files.photo) {
      return res.status(400).json({ success: false, message: "Both certificate and photo files are required" });
    }

    const certificatePath = req.files.certification[0].path;
    const photoPath = req.files.photo[0].path;

    const newExpert = new Expert({
      firstName,
      lastName,
      email,
      gender,
      mobile,
      socialLink,
      areaOfExpertise,
      experience,
      certificationFile: certificatePath,
      photoFile: photoPath
    });

    await newExpert.save();

    res.status(201).json({
      success: true,
      message: "Expert created successfully",
      data: newExpert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all experts
export const getExperts = async (req, res) => {
  try {
    const experts = await Expert.find();
    res.status(200).json({
      success: true,
      data: experts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single expert by ID
export const getExpertById = async (req, res) => {
  try {
    const expert = await Expert.findById(req.params.id);

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    res.status(200).json({
      success: true,
      data: expert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// --- Expert Login Controller ---
export const requestOtp = async (req, res) => {
  const { phone } = req.body;

  console.log('Received phone number:', phone);

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  try {
    // Normalize the phone number to ensure consistency
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check if the phone number exists in the Expert collection
    const existingExpert = await Expert.findOne({ mobileNumber: normalizedPhone });

    if (!existingExpert) {
      return res.status(400).json({ success: false, message: 'Please sign up first' });
    }

    // Generate OTP and send it using Twilio
    const otp = await sendOtp(phone);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Store OTP in the ExpertLogin collection
    await ExpertLogin.findOneAndUpdate(
      { phone: normalizedPhone },
      { otp, otpExpires },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// Verify OTP Controller
export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  try {
    // Normalize the phone number to ensure consistency
    const normalizedPhone = normalizePhoneNumber(phone);

    const expert = await ExpertLogin.findOne({ phone: normalizedPhone });

    if (!expert) {
      return res.status(400).json({ success: false, message: 'Phone number not found in database' });
    }

    if (expert.otp !== otp || expert.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
};

// --- Expert Register Controller ---
export const registerExpert = async (req, res) => {
  const { email, firstName, lastName, gender, mobile } = req.body;

  if (!email || !firstName || !lastName || !gender || !mobile) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  // Log the phone number to confirm it's being received correctly
  console.log('Received phone number for registration:', mobile);

  try {
    const existingExpert = await ExpertRegister.findOne({ email });

    if (existingExpert) {
      return res.status(400).json({ success: false, message: 'Expert already registered' });
    }

    const newExpert = await ExpertRegister.create({ email, firstName, lastName, gender, mobile });
    res.status(201).json({ success: true, message: 'Expert registered successfully', expert: newExpert });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error });
  }
};

// Get All Experts
export const getAllExperts = async (req, res) => {
  try {
    const experts = await ExpertRegister.find();
    res.status(200).json({
      success: true,
      data: experts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error,
    });
  }
};
