import { Admin } from '../model/admin.model.js'
import asyncHandler from '../utils/asyncHandler.js'
import ApiError from "../utils/ApiError.js"
import { Expert } from '../model/expert.model.js';
import { UserToExpertSession } from '../model/usertoexpertsession.model.js';
import dotenv from 'dotenv';

dotenv.config()

const loginAdmin = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email and password are required.' });
  }

  // Simple check against our single user
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    // (Optionally issue a JWT or set a session here)
    return res.status(200).json({ message: 'Login successful!' });
  } else {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
};

// Approve or reject an expert
const updateExpertStatus = async (req, res) => {
  const { expertId } = req.params;
  const { status } = req.body;

  // Only allow "Approved" or "Rejected"
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const updatedExpert = await Expert.findByIdAndUpdate(
      expertId,
      { status },
      { new: true }
    );

    if (!updatedExpert) {
      return res.status(404).json({ success: false, message: 'Expert not found' });
    }

    res.status(200).json({
      success: true,
      message: `Expert ${status.toLowerCase()} successfully`,
      data: updatedExpert,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookingDetails = asyncHandler(async (req, res) => {
  try {
    const bookings = await UserToExpertSession.find().select("areaOfExpertise status amount slots _id");

    const formattedBookings = bookings.map((booking) => {
      const firstSlot = booking.slots?.[0]?.[0]; // First object inside first array of slots

      return {
        bookingId: booking._id.toString().slice(-6), // Shortened MongoDB ID
        areaOfExpertise: booking.areaOfExpertise,
        status: booking.status,
        amount: booking.amount,
        date: firstSlot
          ? `${firstSlot.selectedDate} ${firstSlot.selectedTime}`
          : null,
      };
    });

    res.status(200).json({
      success: true,
      bookings: formattedBookings,
    });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch booking details");
  }
});

const getreviwew=asyncHandler(async (req, res) => {
  try {
    const feedback=await Expert.find().select("_id firstName averageRating email")
    const formattedFeedback = feedback.map((feedback) => {
      return {
        expertId: feedback._id.toString().slice(-6), // Shortened MongoDB ID
        expertName: feedback.firstName,
        averageRating: feedback.averageRating,
        email: feedback.email,
      };
    });
    res.status(200).json({
      success: true,
      feedback: formattedFeedback,
    });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch booking details")
  }
})

export { loginAdmin, updateExpertStatus, getBookingDetails,getreviwew }
