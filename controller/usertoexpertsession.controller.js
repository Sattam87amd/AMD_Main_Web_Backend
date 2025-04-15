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
  const { expertId, areaOfExpertise, date, time, duration, note } = req.body;
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
    areaOfExpertise,
    sessionDate: date,
    sessionTime: time,
    status: 'pending', // Initially set status as 'pending'
    duration,
    note,
  });
console.log(newSession)
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

// Controller for "My Bookings" - When the logged-in user is the one who booked the session (userId)
const getUserBookings = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded._id;

    // Find sessions where the logged-in user is the one who booked the session (userId)
    const sessions = await UserToExpertSession.find({
      userId: userId,
    })
      .populate("userId", "firstName lastName")
      .populate("expertId", "firstName lastName")
      .sort({ sessionDate: 1 });

    if (!sessions.length) {
      return res.status(404).json({ message: "No bookings found for this user." });
    }

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({
      message: "An error occurred while fetching user bookings.",
      error: error.message,
    });
  }
});

// Controller for "My Sessions" - When the logged-in expert is the consulting expert (expertId)
const getExpertSessions = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded._id;

    // Find sessions where the logged-in expert is the consulting expert (expertId)
    const sessions = await UserToExpertSession.find({
      expertId: expertId,
    })
      .populate("userId", "firstName lastName")
      .populate("expertId", "firstName lastName")
      .sort({ sessionDate: 1 });

    if (!sessions.length) {
      return res.status(404).json({ message: "No sessions found for this expert." });
    }

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error fetching expert sessions:", error);
    res.status(500).json({
      message: "An error occurred while fetching expert sessions.",
      error: error.message,
    });
  }
});

// Controller for booking a session for user-to-expert
const bookUserToExpertSession = asyncHandler(async (req, res) => {
  const { expertId, areaOfExpertise, sessionDate, sessionTime,sessionType, duration, note } = req.body;

  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded._id;

    // Check if the expert's session time and session date are available
    const isAvailable = await checkAvailability(expertId, sessionDate, sessionTime);

    if (!isAvailable) {
      return res.status(400).json({
        message: "The selected session date and time are already booked. Please select a different time.",
      });
    }

    const newSession = new UserToExpertSession({
      userId,
      expertId,
      areaOfExpertise,
      sessionDate, 
      sessionTime, 
      sessionType:'user-to-expert',
      status: "pending", // Initially set status as 'pending'
      duration, // Duration of the session
      note,
    });

    await newSession.save();

    // Update session status to 'unconfirmed'
    newSession.status = "unconfirmed";
    await newSession.save();

    res.status(201).json({
      message: "User-to-expert session booked successfully. Status: unconfirmed.",
      session: newSession,
    });
  } catch (error) {
    console.error("Error booking user-to-expert session:", error);
    res.status(500).json({
      message: "An error occurred while booking the session.",
      error: error.message,
    });
  }
});

// // Helper function to get the duration in minutes from the string format
// const getDurationInMinutes = (durationStr) => {
//   if (typeof durationStr === "number") return durationStr;
//   const match = durationStr.match(/(\d+)/);
//   return match ? parseInt(match[1], 10) : 15;
// };

// Accept the session and create a Zoom meeting
const acceptSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await UserToExpertSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status !== "confirmed") {
      const startTime = new Date(session.sessionDate);
      const [hours, minutes] = session.sessionTime.split(":");
      startTime.setHours(hours, minutes, 0, 0); // Set the start time correctly

      const startTimeISO = startTime.toISOString();
      const duration = getDurationInMinutes(session.duration);

      try {
        console.log("📞 Creating Zoom meeting...");
        const zoomData = await createZoomMeeting(
          "aquibhingwala@gmail.com", // Replace with your Zoom account's licensed email
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

// Decline the session
const declineSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await UserToExpertSession.findByIdAndUpdate(
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
const getDurationInMinutes = (duration) => {
  switch (duration) {
    case "Quick - 15min":
      return 15;
    case "Regular - 30min":
      return 30;
    case "Extra - 45min":
      return 45;
    case "All Access - 60min":
      return 60;
    default:
      return 30; // Default duration
  }
};

export { bookSession,
  bookUserToExpertSession,
  getExpertSessions,
  acceptSession,
  declineSession,
  getDurationInMinutes,
  getUserBookings
 };



