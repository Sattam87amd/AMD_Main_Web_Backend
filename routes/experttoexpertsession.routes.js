import { Router } from "express";
import VerifyJwt from "../middleware/auth.middleware.js";
import {
  bookExpertToExpertSession,
  getMySessions,
  getMyBookings,
  declineSession,
  acceptSession,
} from "../controller/experttoexpertsession.controller.js";
const router = Router();

router.post("/experttoexpertsession", VerifyJwt, bookExpertToExpertSession);
router.get("/getexpertsession", VerifyJwt,getMySessions );
router.get("/mybookings", VerifyJwt, getMyBookings)

//route to handle status of session
router.put("/accept/:sessionId", VerifyJwt, acceptSession);
router.put("/decline/:sessionId", VerifyJwt, declineSession);

export default router;
