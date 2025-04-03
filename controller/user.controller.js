import twilio from 'twilio';
import Userlogin from '../model/user.model.js';
import User from '../model/user.model.js'; // Assuming you're using a User model for registration
import dotenv from 'dotenv';

dotenv.config();

// Twilio client setup
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Send OTP via SMS using Twilio
const sendOtp = async (phone) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate OTP
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to ${phone}`);
    return otp; // Return OTP for saving in database
  } catch (error) {
    console.error('Error sending OTP via Twilio:', error);
    throw new Error('Failed to send OTP');
  }
};

// Normalize the phone number (remove non-numeric characters)
const normalizePhoneNumber = (phone) => phone.replace(/[^\d]/g, "");

// 📌 Request OTP (Login Only)
const requestOtp = async (req, res) => {
  const { phone } = req.body;

  console.log('Received phone number:', phone);

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check if the phone number already exists in the User collection
    const existingUser = await User.findOne({ mobileNumber: normalizedPhone });

    if (!existingUser) {
      // If the user doesn't exist, proceed with OTP generation and redirect to registration
      const otp = await sendOtp(phone);
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

      // Store OTP in the Userlogin collection
      await Userlogin.findOneAndUpdate(
        { phone: normalizedPhone },
        { otp, otpExpires },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully. Please proceed with registration.',
        isNewUser: true, // Indicate this is a new user who needs to register
      });
    }

    // If the user exists, generate and send OTP
    const otp = await sendOtp(phone);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Store OTP in the Userlogin collection
    await Userlogin.findOneAndUpdate(
      { phone: normalizedPhone },
      { otp, otpExpires },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully. You are already registered.',
      isNewUser: false, // Indicate this is an existing user
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// 📌 Verify OTP (Login)
const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    const user = await Userlogin.findOne({ phone: normalizedPhone });

    if (!user) {
      return res.status(400).json({ success: false, message: 'OTP request not found. Please request a new OTP.' });
    }

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Check if the user is new or existing
    const isNewUser = await User.findOne({ mobileNumber: normalizedPhone });

    if (isNewUser) {
      // If the user is existing, redirect to the home page
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully. Redirecting to home page...',
        isNewUser:true,
        redirectToHome: true    // Indicate to the frontend that the user should be redirected to home page
      });
    }

    // If the user is new, redirect to the register page
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Redirecting to register page...',
      redirectToRegister: true, // Indicate to the frontend that the user should be redirected to the registration page
      isNewUser:false
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
};

export { requestOtp, verifyOtp };
