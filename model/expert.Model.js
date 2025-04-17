import mongoose from 'mongoose';

const expertSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: false, // Make phone optional
      sparse: true, // Allow multiple documents with null/undefined phone // Ensure uniqueness for non-null phone numbers
      match: /^\d{8,15}$/, // Optional validation for phone number
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
    ratings: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rating', // Reference to the Rating model (you'll define this later)
    }],
    averageRating: {
      type: Number,
      default: 0, // Initialize with a default value
    },
    numberOfRatings: {
      type: Number,
      default: 0, // Initialize with 0
    },
    socialLink: {
      type: String,
      validate: {
        validator: function(value) {
          const linkedinPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/;
          return linkedinPattern.test(value);
        },
        message: props => `${props.value} is not a valid LinkedIn URL!`
      }
    },
   
    areaOfExpertise: String,
    experience: String,
    certificationFile: String,
    photoFile: String,
    otp: String,
    otpExpires: Date,
    price: {
      type: Number, // Save price as a number
      required: false, // Set to true if it is a required field
      min: 100, // You can set a minimum value, like 0, or leave it as is // Ensure the price is less than or equal to 100 Riyals
    },
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