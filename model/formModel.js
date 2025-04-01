import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

const User = mongoose.model("expertRegisterForm", userSchema);

export default User;
