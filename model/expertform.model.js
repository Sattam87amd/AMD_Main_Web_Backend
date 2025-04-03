import mongoose from "mongoose";

// Define the schema for the expert form
const expertFormSchema = new mongoose.Schema(
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
  },
  { timestamps: true, collection: 'expert' }
);

// Define the model with the name 'Expert' and export it
const Expert = mongoose.model("Expert", expertFormSchema);

export default Expert;
