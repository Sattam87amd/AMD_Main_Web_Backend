import express from 'express';

import { Router } from 'express';
import { loginAdmin, updateExpertStatus, getBookingDetails , getreview} from '../controller/admin.controller.js';



const router = Router();

router.post('/login', loginAdmin)
router.put('/experts/:expertId/status', updateExpertStatus);
router.get("/bookings", getBookingDetails);
router.get("/review", getreview);

export default router;