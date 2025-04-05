import { ExpertToExpertSession } from '../model/experttoexpertsession.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import asyncHandler from '../utils/asyncHandler.js'; // Assuming you have this utility
import ApiError from "../utils/ApiError.js"; // Assuming this is your custom error handler

dotenv.config();

// Helper function to check if the consulting expert's session time is available
const checkAvailability = async (consultingExpertId, sessionDate, sessionTime) => {
  // Find if there is any session already booked for the consulting expert at the same time and date
  const existingSession = await ExpertToExpertSession.findOne({
    consultingExpertID: consultingExpertId,
    sessionDate,
    sessionTime,
  });

  // If no session is found, it means the time is available
  return !existingSession;
};

// Expert-to-Expert session booking controller
const bookExpertToExpertSession = asyncHandler(async (req, res) => {
  const { consultingExpertId, category, date, time, duration, optionalNote } = req.body;

  // Get the token from the Authorization header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  // If no token is provided, return an error
  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    // Verify the token and decode the expert's ID (the expert who is booking the session)
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded.expertId; // The expert initiating the session

    // Ensure an expert cannot book a session with themselves
    if (expertId === consultingExpertId) {
      return res.status(400).json({
        message: "An expert cannot book a session with themselves. Please select a different consulting expert.",
      });
    }

    // Check if the consulting expert's time and date are available
    const isAvailable = await checkAvailability(consultingExpertId, date, time);

    if (!isAvailable) {
      return res.status(400).json({
        message: 'The selected date and time are already booked for the consulting expert. Please select a different time.',
      });
    }

    // Create a new session with status 'pending' initially
    const newSession = new ExpertToExpertSession({
      expertId, // The expert initiating the consultation
      consultingExpertID: consultingExpertId, // The expert being consulted
      category,
      sessionDate: date, // Session date in YYYY-MM-DD format
      sessionTime: time, // Session time in HH:mm format
      status: 'pending', // Initially set status as 'pending'
      duration, // Duration of the session (e.g., 'Quick-15min')
      optionalNote, // Optional note for the session
    });

    // Save the session to the database
    await newSession.save();

    // Update the session status to 'unconfirmed' (no payment confirmation yet)
    newSession.status = 'unconfirmed';
    await newSession.save();

    res.status(201).json({
      message: 'Expert-to-Expert session booked successfully. Status: unconfirmed.',
      session: newSession,
    });
  } catch (error) {
    console.error('Error booking Expert-to-Expert session:', error);
    res.status(500).json({
      message: 'An error occurred while booking the session.',
      error: error.message,
    });
  }
});

export { bookExpertToExpertSession };
