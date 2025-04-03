import UserToExpertSession from '../model/UserToExpertSession.js'; // Import the model for user-to-expert sessions
import jwt from 'jsonwebtoken'; // For JWT token validation
import dotenv from 'dotenv';
import { initiatePayment, completePayment } from '../paymentService.js'; // Assuming you have a service for handling payments

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

// Book session controller
export const bookSession = async (req, res) => {
  const { token, expertId, category, sessionDate, sessionTime, duration, optionalNote } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    // Verify the token and decode the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId; // Extract the user ID from the decoded token

    // Check if the time and date for the session are available
    const isAvailable = await checkAvailability(expertId, sessionDate, sessionTime);

    if (!isAvailable) {
      return res.status(400).json({
        message: 'The selected date and time are already booked. Please select a different time.',
      });
    }

    // Initiate the payment process (you can integrate a real payment gateway here)
    const paymentResult = await initiatePayment(userId, expertId, category, sessionDate, sessionTime, duration);

    if (!paymentResult.success) {
      return res.status(500).json({
        message: 'Payment initiation failed. Please try again later.',
      });
    }

    // Once payment is completed, mark the session as unconfirmed
    const newSession = new UserToExpertSession({
      userId,
      expertId,
      category,
      sessionDate,
      sessionTime,
      status: 'pending', // Initially set status as 'pending' before payment
      duration,
      optionalNote,
    });

    // Save the session in the database
    await newSession.save();

    // Complete the payment process
    const paymentCompletionResult = await completePayment(paymentResult.paymentId);

    if (!paymentCompletionResult.success) {
      return res.status(500).json({
        message: 'Payment completion failed. Please try again later.',
      });
    }

    // Update the status of the session to unconfirmed after successful payment
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
};
