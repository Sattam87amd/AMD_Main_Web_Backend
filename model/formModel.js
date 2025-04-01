import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      // default: "John",
      required: true,
    },
    lastName: {
      type: String,
      // default: "Doe",
      required: true,
    },
    mobileNumber: {
      type: String,
      default: "0000000000",
      required: true,
    },
    emailAddress: {
      type: String,
      default: "default@example.com",
      required: true,
    },
    gender:{
      type: String,
      required: true,
    },
    socialMediaLink: {
      type: String,
      required: true,
    },
    areaOfExpertise: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    certificate: {
      type: String, // This will store the URL of the uploaded PDF
      required: true,
    },
    photo: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("expertRegisterForm", userSchema);

export default User;
