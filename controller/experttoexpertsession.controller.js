import { ExpertToExpertSession } from '../model/experttoexpertsession.model.js';
import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import dotenv from 'dotenv';

dotenv.config()

// Function to check if the consulting expert's session time is available
const checkAvailability = async (consultingExpertId, sessionDate, sessionTime) => {
    const existingSession = await ExpertToExpertSession.findOne({
        expertId: consultingExpertId, // Check availability for the consulting expert
        sessionDate,
        sessionTime,
    });

    return !existingSession; // Returns true if no session is found, i.e., time is available
};

// Expert-to-Expert session booking controller wrapped in asyncHandler
const bookExpertToExpertSession = asyncHandler(async (req, res) => {
    // Extract token from headers
    const token = req.headers.authorization?.split(" ")[1]; // Assumes "Bearer <token>"
    if (!token) {
        return res.status(400).json({ message: 'Token is required in the Authorization header' });
    }

    // Extract details from the request body
    const { consultingExpertId, category, date, time, duration, optionalNote } = req.body;

    try {
        // Verify the token and decode the expert's ID (initiating expert)
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const expertId = decoded.expertId; // Extract the expert's ID from the decoded token

        // Ensure the expert is not booking a session with themselves
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
            consultingExpertId, // The expert being consulted
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
