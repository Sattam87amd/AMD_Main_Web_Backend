import twilio from 'twilio';
import Userlogin from '../model/userlogin.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Twilio client setup
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate a random 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Send OTP via SMS using Twilio
const sendOtp = async (phone, otp) => {
  try {
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to ${phone}`);
  } catch (error) {
    console.error('Error sending OTP via Twilio:', error);
    throw new Error('Failed to send OTP');
  }
};

// Normalize the phone number (remove non-numeric characters)
const normalizePhoneNumber = (phone) => phone.replace(/[^\d]/g, "");

// 📌 Request OTP (Login Only)
export const requestOtp = async (req, res) => {
  const { phone } = req.body;

  console.log('Received phone number:', phone);

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

    // Store OTP in Login collection (create entry if not exists)
    await Userlogin.findOneAndUpdate(
      { phone: normalizedPhone },
      { otp, otpExpires },
      { upsert: true, new: true }
    );

    // Send OTP
    await sendOtp(phone, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// 📌 Verify OTP (Login)
export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ message: 'Phone and OTP are required' });
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    const user = await Userlogin.findOne({ phone: normalizedPhone });

    if (!user) {
      return res.status(400).json({ message: 'OTP request not found. Please request a new OTP.' });
    }

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.status(200).json({success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};
