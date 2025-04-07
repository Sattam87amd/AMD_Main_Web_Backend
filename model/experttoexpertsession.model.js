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
       category: {
        type: String,
        enum: ['Career Guidance', 'Digital Marketing', 'Technology', 'Style and Beauty', 'HEalth and Wellness'],
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

  export const ExpertToExpertSession = mongoose.model('ExpertToExpertSession', experttoexpertsessionSchema);

