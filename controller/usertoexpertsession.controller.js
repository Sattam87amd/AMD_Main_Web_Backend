import { UserToExpertSession } from '../model/usertoexpertsession.model.js'
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import asyncHandler from '../utils/asyncHandler.js';
import axios from 'axios'; // Import axios for TAP API calls
import { createZoomMeeting } from '../utils/createZoomMeeting.js'; // Import Zoom meeting creation

dotenv.config();

// Function to check if the session time is available
const checkAvailability = async (expertId) => {
  const existingSession = await UserToExpertSession.findOne({
    expertId,
  });

  return !existingSession; // Returns true if no session is found, i.e., time is available
};

// Function to create a TAP payment
const createTapPayment = async (sessionData, price, successRedirectUrl, cancelRedirectUrl) => {
  try {
    const payload = {
      amount: price,
      currency: "SAR", // Change to your currency
      customer: {
        first_name: sessionData.firstName,
        last_name: sessionData.lastName,
        email: sessionData.email,
        phone: {
          country_code: "+971", // Default to UAE, adjust as needed
          number: sessionData.phone
        }
      },
      source: { id: "src_card" },
      redirect: {
        url: successRedirectUrl
      },
      post: {
        url: cancelRedirectUrl
      },
      metadata: {
        sessionId: sessionData._id.toString(),
        sessionType: "user-to-expert"
      }
    };

    const response = await axios.post(
      "https://api.tap.company/v2/charges",
      payload,
      {
        headers: {
          "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error creating TAP payment:", error.response?.data || error);
    throw new Error("Payment gateway error: " + (error.response?.data?.message || error.message));
  }
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

// Controller for booking a session for user-to-expert with TAP payment integration
const bookUserToExpertSession = asyncHandler(async (req, res) => {
  const { 
    expertId, 
    areaOfExpertise, 
    sessionType, 
    slots, 
    firstName, 
    lastName, 
    duration, 
    note, 
    phone, 
    email,
    price // Price from frontend
  } = req.body;

  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded._id;

    // Create a new user-to-expert session with initial status 'unconfirmed'
    const newSession = new UserToExpertSession({
      userId,
      expertId,
      areaOfExpertise,
      slots,
      status: "unconfirmed",
      sessionType: "user-to-expert",
      duration,
      note,
      firstName,
      lastName,
      phone,
      email,
      price: price || 0, // Store the price
      paymentStatus: 'pending', // Add payment status field
      paymentAmount: price || 0 // Store payment amount
    });

    await newSession.save();

    // Define redirect URLs
    const baseUrl = req.headers.origin || process.env.FRONTEND_URL || "https://www.shourk.com";
    const successRedirectUrl = `${baseUrl}/userpanel/videocall?sessionId=${newSession._id}`;
    const cancelRedirectUrl = `${baseUrl}/userpanel/booking?sessionId=${newSession._id}`;

    // Create TAP payment
    const paymentData = await createTapPayment(
      newSession, 
      price || 0, 
      successRedirectUrl,
      cancelRedirectUrl
    );

    // Save payment reference in session
    newSession.paymentReference = paymentData.id;
    newSession.paymentId = paymentData.id; // Save payment ID
    await newSession.save();

    // Return payment URL and session info
    res.status(201).json({
      message: "Session created. Redirecting to payment.",
      session: newSession,
      paymentUrl: paymentData.transaction.url,
      paymentId: paymentData.id
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

// Payment success handler - API endpoint for success redirect
const handlePaymentSuccess = asyncHandler(async (req, res) => {
  const { sessionId, tap_id } = req.query;

  try {
    // Verify payment status with TAP API
    const paymentVerification = await axios.get(
      `https://api.tap.company/v2/charges/${tap_id}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}`
        }
      }
    );

    const paymentStatus = paymentVerification.data.status;
    const paymentAmount = paymentVerification.data.amount;
    
    // Find and update the session
    const session = await UserToExpertSession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (paymentStatus === "CAPTURED") {
      // Update session with payment details
      session.status = "unconfirmed"; // Change status to unconfirmed when payment is successful
      session.paymentStatus = "completed";
      session.paymentId = tap_id;
      session.paymentAmount = paymentAmount;
      
      await session.save();
      
      // Return success with redirect URL
      return res.status(200).json({
        success: true,
        message: "Payment successful. Session status updated to unconfirmed.",
        redirectUrl: `/userpanel/videocall?sessionId=${sessionId}`
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
        paymentStatus
      });
    }
  } catch (error) {
    console.error("Payment success handler error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error processing payment success", 
      error: error.message 
    });
  }
});

// Helper function to get the duration in minutes from the string format
const getDurationInMinutes = (durationStr) => {
  if (typeof durationStr === "number") return durationStr;
  const match = durationStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 15;
};

export { 
  bookUserToExpertSession,
  getUserBookings,
  getUserBookedSlots,
  handlePaymentSuccess
};