import  {UserToExpertSession} from '../model/usertoexpertsession.model.js' // Import the session model
import jwt from 'jsonwebtoken'; // For JWT token validation
import dotenv from 'dotenv';
import asyncHandler from '../utils/asyncHandler.js'; // Assuming you have an asyncHandler utility

dotenv.config();

// Function to check if the session time is available
const checkAvailability = async (expertId) => {
  const existingSession = await UserToExpertSession.findOne({
    expertId,
  });

  return !existingSession; // Returns true if no session is found, i.e., time is available
};


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
      
      // .sort({ sessionDate: 1 });

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


// Controller for booking a session for user-to-expert
const bookUserToExpertSession = asyncHandler(async (req, res) => {
  const { expertId, areaOfExpertise,sessionType, slots,firstName, lastName,duration, note, phone } = req.body;

  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded._id;

    // // Check if the expert's session time and session date are available
    // const isAvailable = await checkAvailability(expertId);

    // if (!isAvailable) {
    //   return res.status(400).json({
    //     message: "The selected session date and time are already booked. Please select a different time.",
    //   });
    // }

    const newSession = new UserToExpertSession({
      userId,
      expertId,
      areaOfExpertise,
      slots,
      status: "pending",
      sessionType:"user-to-expert", // Initially set status as 'pending'
      duration, // Duration of the session
      note,
      firstName,
      lastName,
      phone
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

// In your backend controller file
 const getUserBookedSlots = asyncHandler(async (req, res) => {
  const { expertId } = req.params;

  try {
    const bookedSessions = await UserToExpertSession.find({
      expertId: expertId,
      status: { $in: ['pending', 'confirmed', 'unconfirmed'] } // Include relevant statuses
    });

    // Extract slots from all sessions
    const bookedSlots = bookedSessions.flatMap(session => session.slots);

    res.status(200).json({
      success: true,
      data: bookedSlots
    });
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booked slots",
      error: error.message
    });
  }
});




// // Helper function to get the duration in minutes from the string format
// const getDurationInMinutes = (durationStr) => {
//   if (typeof durationStr === "number") return durationStr;
//   const match = durationStr.match(/(\d+)/);
//   return match ? parseInt(match[1], 10) : 15;
// };






export { 
  bookUserToExpertSession,
 getUserBookings,
 getUserBookedSlots
 };



