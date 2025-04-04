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
<<<<<<< HEAD
    }, 
    { 
        timestamps: true,
        collection: "user" 
    }
);
=======
    }, { timestamps: true,collection:"user" }
)

export const User= mongoose.model("User",userSchema)
>>>>>>> fa12fb33286654705c8f93135eeb0f646685b649

// Avoid overwriting model if already defined
export const User = mongoose.models.User || mongoose.model("User", userSchema);
