import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
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
        role: {
            type: String,
            enum: ["user"],
        }
    }, 
    { 
        timestamps: true,
        collection: "user" 
    }
);

// Avoid overwriting model if already defined
export const User = mongoose.models.User || mongoose.model("User", userSchema);
