import express from 'express';
import { createRating, getExpertRating } from '../controller/rating.controller.js';

const router = express.Router();

/**
 * @route  POST /api/ratings
 * @desc   Submit a new rating
 */
router.post('/', createRating);

/**
 * @route  GET /api/ratings/:expertId
 * @desc   Get aggregated rating details for one expert
 */
router.get('/:expertId', getExpertRating);

export default router;
