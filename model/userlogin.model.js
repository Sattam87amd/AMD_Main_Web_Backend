import mongoose from "mongoose";

const UserSchemalogin = new mongoose.Schema(
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
    }, { timestamps: true,collection:"user" }
)

const Userlogin= mongoose.model("login",UserSchemalogin)

export default Userlogin