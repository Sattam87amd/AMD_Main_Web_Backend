import { ExpertToExpertSession } from "../model/experttoexpertsession.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.js"; // Assuming you have this utility
import ApiError from "../utils/ApiError.js"; // Assuming this is your custom error handler

dotenv.config();

// Helper function to check if the consulting expert's session sessionTime is available
const checkAvailability = async (consultingExpertId, sessionDate, sessionTime) => {
  // Find if there is any session already booked for the consulting expert at the same sessionTime and sessionDate
  const existingSession = await ExpertToExpertSession.findOne({
    consultingExpertID: consultingExpertId,
    sessionDate,
    sessionTime,
  });

  // If no session is found, it means the sessionTime is available
  return !existingSession;
};

// Function to fetch all sessions booked by or for the expert
const getAllBookedSessions = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded._id;

    // Find all sessions where the expert is either the expertId or consultingExpertID
    const sessions = await ExpertToExpertSession.find({
      $or: [{ expertId: expertId }, { consultingExpertID: expertId }],
    })
      .populate("expertId", "firstName lastName") // Populate expert's name (add more fields if needed)
      .populate("consultingExpertID", "firstName lastName") // Populate consulting expert's name (if necessary)
      .sort({ sessionDate: 1 });

    if (!sessions.length) {
      return res
        .status(404)
        .json({ message: "No sessions found for this expert." });
    }

    res.status(200).json(sessions); // Return all sessions with populated expert details
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      message: "An error occurred while fetching sessions.",
      error: error.message,
    });
  }
});

// Expert-to-Expert session booking controller
const bookExpertToExpertSession = asyncHandler(async (req, res) => {
  const { consultingExpertId, areaOfExpertise, sessionDate, sessionTime, duration, optionalNote, firstName, lastName, email, mobile } = req.body;

  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded._id;

    if (expertId === consultingExpertId) {
      return res.status(400).json({
        message:
          "An expert cannot book a session with themselves. Please select a different consulting expert.",
      });
    }

    // Check if the consulting expert's sessionTime and sessionDate are available
    const isAvailable = await checkAvailability(consultingExpertId, sessionDate, sessionTime);

    if (!isAvailable) {
      return res.status(400).json({
        message: 'The selected sessionDate and sessionTime are already booked for the consulting expert. Please select a different sessionTime.',
      });
    }

    const newSession = new ExpertToExpertSession({
      expertId,
      consultingExpertID: consultingExpertId,
      areaOfExpertise,
      sessionDate, // Session sessionDate in YYYY-MM-DD format
      sessionTime, // Session sessionTime in HH:mm format
      status: 'pending', // Initially set status as 'pending'
      duration, // Duration of the session (e.g., 'Quick-15min')
      optionalNote,
      firstName,   // Save the user data
      lastName,
      mobile,
      email, // Optional note for the session
    });

    await newSession.save();

    // UpsessionDate the session status to 'unconfirmed' (no payment confirmation yet)
    newSession.status = 'unconfirmed';
    await newSession.save();

    res.status(201).json({
      message:
        "Expert-to-Expert session booked successfully. Status: unconfirmed.",
      session: newSession,
    });
  } catch (error) {
    console.error("Error booking Expert-to-Expert session:", error);
    res.status(500).json({
      message: "An error occurred while booking the session.",
      error: error.message,
    });
  }
});

const acceptSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params; // Get the session ID from the URL

  try {
    // Find the session by ID and update its status to 'confirmed'
    const session = await ExpertToExpertSession.findByIdAndUpdate(
      sessionId,
      { status: "confirmed" },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json({
      message: "Session accepted successfully.",
      session,
    });
  } catch (error) {
    console.error("Error accepting session:", error);
    res.status(500).json({
      message: "An error occurred while accepting the session.",
      error: error.message,
    });
  }
});

// Decline session controller
const declineSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params; // Get the session ID from the URL

  try {
    // Find the session by ID and update its status to 'rejected'
    const session = await ExpertToExpertSession.findByIdAndUpdate(
      sessionId,
      { status: "rejected" },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json({
      message: "Session rejected successfully.",
      session,
    });
  } catch (error) {
    console.error("Error rejecting session:", error);
    res.status(500).json({
      message: "An error occurred while rejecting the session.",
      error: error.message,
    });
  }
});

export {
  bookExpertToExpertSession,
  getAllBookedSessions,
  acceptSession,
  declineSession,
};
