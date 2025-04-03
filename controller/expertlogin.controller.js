import twilio from 'twilio';
import ExpertLogin from '../model/expertlogin.model.js';  // Changed from Login to ExpertLogin
import ExpertForm from '../model/expertform.model.js'; // Check if expert exists in the expert collection
import dotenv from 'dotenv';

dotenv.config();

// Twilio client
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate a random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send OTP via SMS using Twilio API
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

// Normalize the phone number by removing non-numeric characters
const normalizePhoneNumber = (phone) => {
  return phone.replace(/[^\d]/g, ""); // This will remove all non-numeric characters
};

// Request OTP Controller
export const requestOtp = async (req, res) => {
  const { phone } = req.body;

  console.log('Received phone number:', phone);

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    // Normalize the phone number to ensure consistency
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check if the phone number exists in the Expert collection
    const existingExpert = await ExpertForm.findOne({ mobileNumber: normalizedPhone });

    if (!existingExpert) {
      return res.status(400).json({ message: 'Please sign up first' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Store OTP in the ExpertLogin collection
    await ExpertLogin.findOneAndUpdate(
      { phone: normalizedPhone },
      { otp, otpExpires },
      { upsert: true, new: true }
    );

    // Send OTP using Twilio
    await sendOtp(phone, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// Verify OTP Controller
export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ message: 'Phone and OTP are required' });
  }

  try {
    // Normalize the phone number to ensure consistency
    const normalizedPhone = normalizePhoneNumber(phone);

    const expert = await ExpertLogin.findOne({ phone: normalizedPhone });

    if (!expert) {
      return res.status(400).json({ message: 'Phone number not found in database' });
    }

    if (expert.otp !== otp || expert.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};
