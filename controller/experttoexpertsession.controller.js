import { ExpertToExpertSession } from "../model/experttoexpertsession.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.js"; // Assuming you have this utility
import ApiError from "../utils/ApiError.js"; // Assuming this is your custom error handler
import { createZoomMeeting } from '../utils/createZoomMeeting.js';

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

/// Controller for "My Bookings" - When the logged-in expert is the one who booked the session (i.e., expertId)
const getMyBookings = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded._id;

    // Find sessions where the logged-in expert is the one who booked the session (expertId)
    const sessions = await ExpertToExpertSession.find({
      expertId: expertId,
    })
      .populate("expertId", "firstName lastName")
      .populate("consultingExpertID", "firstName lastName")
      .sort({ sessionDate: 1 });

    if (!sessions.length) {
      return res.status(404).json({ message: "No bookings found for this expert." });
    }

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      message: "An error occurred while fetching bookings.",
      error: error.message,
    });
  }
});

// Controller for "My Sessions" - When the logged-in expert is the consulting expert (i.e., consultingExpertID)
const getMySessions = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded._id;

    // Find sessions where the logged-in expert is the consulting expert (consultingExpertID)
    const sessions = await ExpertToExpertSession.find({
      consultingExpertID: expertId,
    })
      .populate("expertId", "firstName lastName")
      .populate("consultingExpertID", "firstName lastName")
      .sort({ sessionDate: 1 });

    if (!sessions.length) {
      return res.status(404).json({ message: "No sessions found for this expert." });
    }

    res.status(200).json(sessions);
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

// Helper: Convert "Quick - 15min" → 15
const getDurationInMinutes = (durationStr) => {
  if (typeof durationStr === "number") return durationStr;
  const match = durationStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 15;
};

const acceptSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await ExpertToExpertSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status !== "confirmed") {
      const startTime = new Date(session.sessionDate); // assuming session.sessionDate is a valid date string
      const [hours, minutes] = session.sessionTime.split(":"); // Split the session time (e.g. "03:00") into hours and minutes
      startTime.setHours(hours, minutes, 0, 0); // Set the hours and minutes correctly in the Date object

      // Convert the start time to ISO string for Zoom API
      const startTimeISO = startTime.toISOString();
      const duration = getDurationInMinutes(session.duration);

      try {
        console.log("📞 Creating Zoom meeting...");
        const zoomData = await createZoomMeeting(
          "aquibhingwala@gmail.com", // Replace with your licensed Zoom email
          `Session with ${session.firstName} ${session.lastName}`,
          startTimeISO,
          duration
        );

        session.status = "confirmed";
        session.zoomMeetingLink = zoomData.join_url;
        session.zoomMeetingId = zoomData.id;
        session.zoomPassword = zoomData.password;

        await session.save();
        console.log("✅ Zoom meeting created and session updated!");
      } catch (zoomErr) {
        console.error("❌ Zoom API Error:", zoomErr.response?.data || zoomErr.message);
        return res.status(500).json({
          message: "Zoom meeting creation failed",
          error: zoomErr.response?.data || zoomErr.message,
        });
      }
    }

    res.status(200).json({
      message: "Session accepted and Zoom meeting created.",
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
  getMySessions,
  acceptSession,
  declineSession,
  getMyBookings
};
