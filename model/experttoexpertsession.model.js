import mongoose, { Schema } from 'mongoose';

const experttoexpertsessionSchema = new Schema({
  consultingExpertID:{
    type:mongoose.Schema.Types.ObjectId,
    required:true,
    ref:'Expert'
  },
  
  expertId:{
      type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:'Expert',
    },
       areaOfExpertise: {
        type: String,
        enum: ['Home', 'Digital Marketing', 'Technology', 'Style and Beauty', 'HEalth and Wellness'],
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
        enum: ['Quick - 15min', 'Regular - 30min', 'Extra - 45min', 'All Access - 60min'],
        required: true, // Duration of the appointment
      },
      optionalNote: {
        type: String, // Optional note for the appointment
        default: '',
      },
      firstName:{
        type:String,
      },
      lastName:{
        type:String
      },
      mobile:{
        type:Number
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
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt fields
  );

  export const ExpertToExpertSession = mongoose.model('ExpertToExpertSession', experttoexpertsessionSchema);

