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
  const { token, expertId, category, date, time, duration, optionalNote } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    // Verify the token and decode the user ID
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded.userId; // Extract the user ID from the decoded token

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
      sessionDate: date, // Using 'date' as per your request
      sessionTime: time, // Using 'time' as per your request
      status: 'pending', // Initially set status as 'pending'
      duration,
      optionalNote,
    });

    // Save the session in the database
    await newSession.save();

    // Update the session status to 'unconfirmed' (no payment confirmation yet)
    newSession.status = 'unconfirmed';
    await newSession.save();

    res.status(201).json({
      message: 'Session booked successfully. Status: unconfirmed.',
      session: newSession,
    });
  } catch (error) {
    console.error('Error booking session:', error);
    res.status(500).json({
      message: 'An error occurred while booking the session.',
      error: error.message,
    });
  }
});

export { bookSession };



