import { mongoose, Schema } from 'mongoose';

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
    areaOfExpertise: {
      type: String,
      required: true, // Category for the appointment
    },
    // sessionDate: {
    //   type: Date,
    //   required: true, // Date of the appointment
    // },
    // sessionTime: {
    //   type: String,
    //   required: true, // Time of the appointment (string format like '10:00 AM', '2:00 PM', etc.)
    // },
    slots: [{
      type: Array,
    }],
    status: {
      type: String,
      enum: ['pending', 'unconfirmed', 'confirmed', 'completed', 'rejected', 'Rating Submitted'],
      default: 'pending', // Status of the appointment
    },
    duration: {
      type: String,
      enum: ['Quick - 15min', 'Regular - 30min', 'Extra - 45min', 'All Access - 60min'],
      required: true, // Duration of the appointment
    },
    note: {
      type: String, // Optional note for the appo intment
      default: '',
    },
    sessionType: { 
      type: String,
      enum: ['user-to-expert']
     },

    zoomMeetingLink: {
      type: String, // Store the Zoom meeting URL
      default: '',
    },
    zoomMeetingId: {
      type: String, // Store the Zoom meeting ID
      default: '',
    },
    zoomPassword: {
      type: String, // Store the Zoom meeting password (if available)
      default: '',
    },
     // 👇 Add these
     firstName: { type: String }, // Ensure these fields are present
     lastName: { type: String },
     email: { type: String },
     phone: { type: String },

     paymentStatus:{type:String},
      paymentId:{type:String},
      paymentAmount:{type:String}
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

export const UserToExpertSession = mongoose.model("UserToExpertSession", usertoexpertsessionSchema);


