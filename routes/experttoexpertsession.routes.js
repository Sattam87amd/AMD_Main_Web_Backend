import { Router } from "express";
import VerifyJwt from "../middleware/auth.middleware.js";
import {
  bookExpertToExpertSession,
  getMySessions,
  getMyBookings,
  declineSession,
  acceptSession,
  getExpertBookedSlots,
  handlePaymentWebhook
} from "../controller/experttoexpertsession.controller.js";
const router = Router();

router.post("/experttoexpertsession", VerifyJwt, bookExpertToExpertSession);
router.get("/getexpertsession", VerifyJwt,getMySessions );
router.get("/mybookings", VerifyJwt, getMyBookings)

//route to handle status of session
router.put("/accept", VerifyJwt, acceptSession);
router.put("/decline", VerifyJwt, declineSession);

router.get('/booked-slots/:expertId', getExpertBookedSlots);

router.post('/session/payment-webhook', handlePaymentWebhook);


export default router;
