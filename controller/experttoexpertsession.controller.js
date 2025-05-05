import { ExpertToExpertSession } from "../model/experttoexpertsession.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { createZoomMeeting } from '../utils/createZoomMeeting.js';
import { UserToExpertSession } from "../model/usertoexpertsession.model.js";
import axios from "axios"; // Make sure to import axios

dotenv.config();

// Helper function to check if the consulting expert's session time is available
const checkAvailability = async (consultingExpertId, sessionDate, sessionTime) => {
  try {
    // Find if there is any session already booked for the consulting expert at the same sessionTime and sessionDate
    const existingExpertSession = await ExpertToExpertSession.findOne({
      consultingExpertID: consultingExpertId,
      sessionDate,
      sessionTime,
    });
    
    // If expert-to-expert session exists, time is not available
    if (existingExpertSession) {
      return false;
    }
    
    // Now check if there's a user-to-expert session booked
    const existingUserSession = await UserToExpertSession.findOne({
      expertId: consultingExpertId,
      sessionDate,
      sessionTime
    });
    
    // If no session is found in either collection, the time is available
    return !existingUserSession;
    
  } catch (error) {
    console.log("Error checking availability:", error);
    throw new ApiError("Error checking availability", 500);
  }
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
          number: sessionData.mobile
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
        sessionType: "expert-to-expert"
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

// Get expert booked slots from both ExpertToExpertSession and UserToExpertSession collections
const getExpertBookedSlots = asyncHandler(async (req, res) => {
  const { expertId } = req.params;

  try {
    // Find booked slots in ExpertToExpertSession
    const expertToExpertSessions = await ExpertToExpertSession.find({
      consultingExpertID: expertId,
      status: { $in: ['pending', 'confirmed', 'unconfirmed'] }
    });
    
    // Find booked slots in UserToExpertSession
    const userToExpertSessions = await UserToExpertSession.find({
      expertId: expertId,
      status: { $in: ['pending', 'confirmed', 'unconfirmed'] }
    });
    
    // Extract slots from expert-to-expert sessions
    const expertToExpertSlots = expertToExpertSessions.flatMap(session => session.slots);
    
    // Extract slots from user-to-expert sessions
    const userToExpertSlots = userToExpertSessions.flatMap(session => session.slots);
    
    // Combine slots from both collections
    const allBookedSlots = [...expertToExpertSlots, ...userToExpertSlots];

    res.status(200).json({
      success: true,
      data: allBookedSlots
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

// Controller for "My Bookings" - When the logged-in expert is the one who booked the session
const getMyBookings = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded._id;

    // Find sessions where the logged-in expert is the one who booked the session
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

const getMySessions = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded._id;
    console.log(expertId);

    // Find sessions where the logged-in expert is the consulting expert
    const expertSessions = await ExpertToExpertSession.find({
      consultingExpertID: expertId,
    })
      .populate("expertId", "firstName lastName")
      .populate("consultingExpertID", "firstName lastName")
      .sort({ expertSessionDate: 1 });

    // Find sessions where the logged-in expert is the consulting expert
    const userSessions = await UserToExpertSession.find({
      expertId: expertId,
    })
      .populate("userId", "firstName lastName")
      .populate("expertId", "firstName lastName");
      
    // Check if both expertSessions and userSessions are empty
    if (expertSessions.length === 0 && userSessions.length === 0) {
      return res.status(404).json({ message: "No sessions found for this expert." });
    }

    // Respond with the sessions
    res.status(200).json({ expertSessions, userSessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      message: "An error occurred while fetching sessions.",
      error: error.message,
    });
  }
});

// Expert-to-Expert session booking controller with TAP payment integration
const bookExpertToExpertSession = asyncHandler(async (req, res) => {
  const { 
    consultingExpertId, 
    areaOfExpertise, 
    slots, 
    duration, 
    note, 
    sessionType, 
    firstName, 
    lastName, 
    email, 
    mobile,
    price // Price from frontend
  } = req.body;

  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expertId = decoded._id;

    if (expertId === consultingExpertId) {
      return res.status(400).json({
        message: "An expert cannot book a session with themselves. Please select a different consulting expert.",
      });
    }

    // // Check if the consulting expert's slots are available
    // const isAvailable = await checkAvailability(consultingExpertId, slots);

    // if (!isAvailable) {
    //   return res.status(400).json({
    //     message: 'The selected slots are already booked for the consulting expert. Please select different times.',
    //   });
    // }

    // Create a session with pending status
    const newSession = new ExpertToExpertSession({
      expertId,
      consultingExpertID: consultingExpertId,
      areaOfExpertise,
      slots,
      status: 'unconfirmed', // Initially set status as 'pending'
      sessionType: 'expert-to-expert',
      duration,
      note,
      firstName,
      lastName,
      mobile,
      email,
      price: price || 0, // Store the price
      paymentStatus: 'pending', // Add payment status field
      paymentAmount: price || 0 // Store payment amount
    });

    await newSession.save();

    // Define redirect URLs
    const baseUrl = process.env.FRONTEND_URL || "https://www.shourk.com";
    const successRedirectUrl = `${baseUrl}/expertpanel/videocall?sessionId=${newSession._id}`;
    const cancelRedirectUrl = `${baseUrl}/expertpanel/expertbooking?sessionId=${newSession._id}`;

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
    console.error("Error booking Expert-to-Expert session:", error);
    res.status(500).json({
      message: "An error occurred while booking the session.",
      error: error.message,
    });
  }
});

// Payment webhook handler
const handlePaymentWebhook = asyncHandler(async (req, res) => {
  try {
    const { id, metadata, status, amount } = req.body;
    
    if (!metadata || !metadata.sessionId) {
      return res.status(400).json({ message: "Invalid webhook data: missing session ID" });
    }

    // Find the session
    let session;
    if (metadata.sessionType === "expert-to-expert") {
      session = await ExpertToExpertSession.findById(metadata.sessionId);
    } else {
      session = await UserToExpertSession.findById(metadata.sessionId);
    }

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Update session based on payment status
    if (status === "CAPTURED" || status === "PAID" || status === "AUTHORIZED") {
      session.status = "unconfirmed"; // Session created but needs expert confirmation
      session.paymentStatus = "completed";
      session.paymentId = id;
      session.paymentAmount = amount;
    } else if (status === "FAILED" || status === "CANCELLED" || status === "DECLINED" || status === "UNAUTHORIZED") {
      session.status = "payment_failed";
      session.paymentStatus = "failed";
      session.paymentId = id;
    } else {
      session.paymentStatus = status.toLowerCase();
      session.paymentId = id;
    }

    await session.save();
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Payment webhook error:", error);
    res.status(500).json({ message: "Error processing payment webhook", error: error.message });
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
    const session = await ExpertToExpertSession.findById(sessionId);
    
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
        redirectUrl: `/expertpanel/videocall?sessionId=${sessionId}`
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

// To accept the user request 
const acceptSession = asyncHandler(async (req, res) => {
  const { id, selectedDate, selectedTime } = req.body;

  console.log(id);
  console.log(selectedDate, selectedTime);

  try {
    // First, check in the ExpertToExpertSession collection
    let session = await ExpertToExpertSession.findById(id);

    // If not found in ExpertToExpertSession, check in UserToExpertSession collection
    if (!session) {
      session = await UserToExpertSession.findById(id);
    }

    // If the session is still not found, return an error
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Check if payment is completed for expert sessions
    if (session.collection.name === 'experttoexpertsessions' && session.paymentStatus !== 'completed') {
      return res.status(400).json({ message: "Cannot accept session with incomplete payment" });
    }

    // Update the slots with the new date and time
    session.slots = [
      {
        selectedDate: selectedDate,
        selectedTime: selectedTime
      }
    ];

    // Update the session status to 'confirmed'
    session.status = 'confirmed';

    // Create the Zoom meeting
    const startTime = new Date(selectedDate);

    // Handle the time format (e.g., "10:00 am" or "10:00 pm")
    const [time, period] = selectedTime.split(" "); // Split into time and AM/PM period
    const [hours, minutes] = time.split(":"); // Split the time into hours and minutes

    let hour = parseInt(hours);

    // Convert the hour to 24-hour format
    if (period.toLowerCase() === 'pm' && hour < 12) {
      hour += 12; // Convert PM times to 24-hour format
    } else if (period.toLowerCase() === 'am' && hour === 12) {
      hour = 0; // Handle 12 AM as 00:00 in 24-hour format
    }

    startTime.setHours(hour, parseInt(minutes), 0, 0); // Set the hours and minutes in the Date object

    const startTimeISO = startTime.toISOString(); // Convert to ISO string
    const durationMinutes = session.duration ? getDurationInMinutes(session.duration) : 15;

    try {
      console.log("📞 Creating Zoom meeting...");
      const zoomData = await createZoomMeeting(
        "aquibhingwala@gmail.com", // Replace with your licensed Zoom email
        `Session with ${session.firstName || session.userFirstName} ${session.lastName || session.userLastName}`,
        startTimeISO,
        durationMinutes
      );

      // Update the session with Zoom meeting details
      session.zoomMeetingLink = zoomData.join_url;
      session.zoomMeetingId = zoomData.id;
      session.zoomPassword = zoomData.password;

      // Save the updated session
      await session.save();
      console.log("✅ Zoom meeting created and session updated!");

    } catch (zoomErr) {
      console.error("❌ Zoom API Error:", zoomErr.response?.data || zoomErr.message);
      return res.status(500).json({
        message: "Zoom meeting creation failed",
        error: zoomErr.response?.data || zoomErr.message,
      });
    }

    // Send the response with the updated session
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

// Helper: Convert "Quick - 15min" → 15
const getDurationInMinutes = (durationStr) => {
  if (typeof durationStr === "number") return durationStr;
  const match = durationStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 15;
};

// To decline the user request
const declineSession = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    // Try to find the session in both ExpertToExpertSession and UserToExpertSession
    let session = await ExpertToExpertSession.findById(id);
    
    if (!session) {
      session = await UserToExpertSession.findById(id);
    }

    // If neither session is found, return an error
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Update the session status to 'rejected'
    session.status = "rejected";
    await session.save();

    // If payment was completed, initiate refund
    if (session.paymentStatus === 'completed' && session.paymentReference) {
      try {
        // Initiate refund with TAP
        await axios.post(
          `https://api.tap.company/v2/refunds`,
          {
            charge_id: session.paymentReference,
            amount: session.price || session.paymentAmount,
            currency: "SAR", // Use the same currency as the charge
            reason: "Session declined by expert",
            customer: {
              first_name: session.firstName,
              last_name: session.lastName,
              email: session.email
            }
          },
          {
            headers: {
              "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );
        
        session.paymentStatus = "refunded";
        await session.save();
      } catch (refundError) {
        console.error("Error processing refund:", refundError);
        // Still mark session as rejected, but log the refund error
      }
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
  getMyBookings,
  getExpertBookedSlots,
  handlePaymentWebhook,
  handlePaymentSuccess
};