import {mongoose, Schema} from 'mongoose';

const usertoexpertsessionSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Referencing the _id of the User model
      required: true,
    },
    expertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expert', // Referencing the _id of the Expert model
      required: true,
    },
    category: {
      type: String,
      required: true, // Category for the appointment
    },
    sessionDate: {
      type: Date,
      required: true, // Date of the appointment
    },
    sessionTime: {
      type: String,
      required: true, // Time of the appointment (string format like '10:00 AM', '2:00 PM', etc.)
    },
    status: {
      type: String,
      enum: ['pending', 'unconfirmed' , 'confirmed', 'completed' , 'rejected'],
      default: 'pending', // Status of the appointment
    },
    duration: {
      type: String,
      enum: ['Quick-15 min', 'Regular-30 min', 'Extra-45 min', 'All Access-60 min'],
      required: true, // Duration of the appointment
    },
    optionalNote: {
      type: String, // Optional note for the appointment
      default: '',
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

export const UserToExpertSession = mongoose.model("UserToExpertSession", usertoexpertsessionSchema);


