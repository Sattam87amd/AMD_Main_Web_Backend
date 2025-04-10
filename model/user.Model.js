import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{8,15}$/,
    },
    firstName: String,
    lastName: String,
    email: String,
    otp: String,
    otpExpires: Date,
    role: {
      type: String,
      enum: ["user"],
    },
    photoFile: String,
  },
  { timestamps: true, collection: "user" }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
