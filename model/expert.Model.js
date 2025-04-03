import mongoose from 'mongoose';

// Expert Schema
const expertSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      unique: true, // Ensure mobile numbers are unique
    },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Prefer not to say'],
      required: true,
    },
    socialMediaLink: {
      type: String,
    },
    areaOfExpertise: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
    },
    certificationFile: {
      type: String, // Path to the uploaded certification file
    },
    photoFile: {
      type: String, // Path to the uploaded photo file
    },
    // Login Information
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
    // Register Information
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
    },
  },
  { timestamps: true, collection: 'expert' }
);

// Expert Model
const Expert = mongoose.model("Expert", expertSchema);

export default Expert;
