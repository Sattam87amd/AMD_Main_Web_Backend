import  {UserToExpertSession} from '../model/usertoexpertsession.model.js' // Import the session model
import jwt from 'jsonwebtoken'; // For JWT token validation
import dotenv from 'dotenv';
import asyncHandler from '../utils/asyncHandler.js'; // Assuming you have an asyncHandler utility

dotenv.config();

// Function to check if the session time is available
const checkAvailability = async (expertId, sessionDate, sessionTime) => {
  const existingSession = await UserToExpertSession.findOne({
    expertId,
    sessionDate,
    sessionTime,
  });

  return !existingSession; // Returns true if no session is found, i.e., time is available
};

// Book session controller wrapped in asyncHandler
const bookSession = asyncHandler(async (req, res) => {
  const { expertId, category, date, time, duration, optionalNote } = req.body;
  const userId = req.user._id;  // Extract userId from req.user after VerifyJwt middleware

  // Check if the time and date for the session are available
  const isAvailable = await checkAvailability(expertId, date, time);

  if (!isAvailable) {
    return res.status(400).json({
      message: 'The selected date and time are already booked. Please select a different time.',
    });
  }

  // Create a new session with status 'pending' initially
  const newSession = new UserToExpertSession({
    userId,
    expertId,
    category,
    sessionDate: date,
    sessionTime: time,
    status: 'pending', // Initially set status as 'pending'
    duration,
    optionalNote,
  });

  // Save the session in the database
  await newSession.save();

  // Update the session status to 'unconfirmed'
  newSession.status = 'unconfirmed';
  await newSession.save();

  res.status(201).json({
    message: 'Session booked successfully. Status: unconfirmed.',
    session: newSession,
  });
});

export { bookSession };



