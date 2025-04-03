import mongoose from 'mongoose';

const loginSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^[6-9]\d{9}$/, // Basic validation for Indian phone numbers
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpires: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

const ExpertLogin = mongoose.model('ExpertLogin', loginSchema); // Change model name to ExpertLogin

export default ExpertLogin;
