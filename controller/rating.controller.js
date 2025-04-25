import mongoose from 'mongoose';
import Rating from '../model/rating.model.js';
import { ExpertToExpertSession } from '../model/experttoexpertsession.model.js';
import { Expert } from '../model/expert.model.js';
import {UserToExpertSession} from '../model/usertoexpertsession.model.js'
/**
 * @desc    Create a new rating
 * @route   POST /api/ratings
 * @access  Public or Protected (depends on your setup)
 */


export const createRating = async (req, res) => {
  try {
    const { expertId, raterId, sessionType, rating, comment } = req.body;

    // Basic validations
    if (!expertId || !raterId || !sessionType || rating == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create and save the rating document
    const newRating = new Rating({
      expertId,
      raterId,
      sessionType,
      rating,
      comment,
    });

    await newRating.save();

    // Now update the Expert model with the new rating and recalculate the average rating
    const expert = await Expert.findById(expertId);

    if (!expert) {
      return res.status(404).json({ message: 'Expert not found' });
    }

    // Ensure ratings array is initialized
    if (!expert.ratings) {
      expert.ratings = [];  // Initialize the ratings array if it's not already initialized
    }

    // Add the new rating to the expert's ratings array
    expert.ratings.push(newRating._id);
    expert.numberOfRatings += 1;

    // Recalculate the average rating using incremental calculation
    const previousAverageRating = expert.averageRating;
    const previousNumberOfRatings = expert.numberOfRatings - 1; // Before this new rating

    const newAverageRating = (previousAverageRating * previousNumberOfRatings + rating) / expert.numberOfRatings;

    expert.averageRating = newAverageRating;

    // Save the expert model with the updated ratings and average rating
    await expert.save();

    return res.status(201).json({
      message: 'Rating submitted successfully',
      rating: newRating,
    });
  } catch (error) {
    console.error('Error creating rating:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


/**
 * @desc    Get aggregated rating (avg + count) for an expert
 * @route   GET /api/ratings/:expertId
 * @access  Public or Protected (depends on your setup)
 */
export const getExpertRating = async (req, res) => {
  try {
    const { expertId } = req.params;

    // Validate expertId
    if (!expertId) {
      return res.status(400).json({ message: 'Expert ID is required' });
    }

    // Use aggregation to compute average rating and total rating count
    const result = await Rating.aggregate([
      {
        $match: {
          expertId: new mongoose.Types.ObjectId(expertId),
        },
      },
      {
        $group: {
          _id: '$expertId',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    // If no ratings found, return defaults
    if (!result || result.length === 0) {
      return res.status(200).json({
        expertId,
        averageRating: 0,
        ratingCount: 0,
      });
    }

    // Return the aggregated result
    return res.status(200).json({
      expertId: result[0]._id,
      averageRating: result[0].averageRating,
      ratingCount: result[0].ratingCount,
    });
  } catch (error) {
    console.error('Error fetching expert rating:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status, sessionType } = req.body;

  if (status !== "Rating Submitted") {
    return res.status(400).json({ message: "Invalid status update" });
  }

  try {
    let updatedSession;

    if (sessionType === "expert-to-expert") {
      updatedSession = await ExpertToExpertSession.findByIdAndUpdate(
        id,
        { status: "Rating Submitted" },
        { new: true }
      );
    } else if (sessionType === "user-to-expert") {
      updatedSession = await UserToExpertSession.findByIdAndUpdate(
        id,
        { status: "Rating Submitted" },
        { new: true }
      );
    } else {
      return res.status(400).json({ message: "Invalid session type" });
    }

    if (!updatedSession) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({
      message: "Booking status updated to Rating Submitted",
      booking: updatedSession,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};