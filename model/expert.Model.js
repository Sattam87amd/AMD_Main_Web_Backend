import mongoose from 'mongoose';

const expertSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{8,15}$/,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Prefer not to say'],
    },
    socialLink: String,
    areaOfExpertise: String,
    experience: String,
    certificationFile: String,
    photoFile: String,
    otp: String,
    otpExpires: Date,
    role: {
      type: String,
      enum: ["expert"],
      default: "expert"
    },
    status:{
     type:String,
     enum:["Approved"],
     default:"Approved"

    },

  },
  { timestamps: true, collection: 'expert' }
);

export const Expert = mongoose.models.Expert || mongoose.model("Expert", expertSchema);