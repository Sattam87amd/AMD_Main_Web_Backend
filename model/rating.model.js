import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema(
  {
    expertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expert', // The Model name for Experts (from formModel.js, if that's your "expert" model)
      required: true,
    },
    raterId: {
      type: mongoose.Schema.Types.ObjectId,
      // If you store your user or expert in a different collection, reference that model here
      required: true, 
      // ref: 'Expert', // Assuming you have a User model for users who rate the experts
     refPath: 'raterType',
    },
    sessionType: {
      type: String,
      enum: ['user-to-expert', 'expert-to-expert'],
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      default: '',
    },
    raterType: {
      type: String,
      enum: ['User', 'Expert'],  // This field will indicate whether raterId is a User or an Expert
      required: true,
    }
  },
  { timestamps: true }
);

const Rating = mongoose.model('Rating', ratingSchema);
export default Rating;
