import mongoose from 'mongoose';
import Rating from '../model/rating.model.js';

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

    // Create and save rating
    const newRating = new Rating({
      expertId,
      raterId,
      sessionType,
      rating,
      comment,
    });

    await newRating.save();

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
