import { Router } from 'express';
import { 
    bookUserToExpertSession,
  
    getUserBookings,
} from '../controller/usertoexpertsession.controller.js';
import VerifyJwt from '../middleware/auth.middleware.js';
const router = Router();

//router.post('/usertoexpertsession',VerifyJwt, bookSession);

//router.get("/getusersession", VerifyJwt,getMySessions );
//router.get("/mybookings", VerifyJwt, getMyBookings)

//route to handle status of session
// router.put("/accept/:sessionId", VerifyJwt, acceptSession);
// router.put("/decline/:sessionId", VerifyJwt, declineSession);

// Route for booking a session (User to Expert)
router.post("/usertoexpertsession", bookUserToExpertSession);

// Route for getting user bookings (User's past bookings)
router.get("/Userbookings", getUserBookings);

// // Route for getting expert sessions (Sessions where the expert is providing service)
// router.get("/sessions", getExpertSessions);

// // Route for accepting a session (Confirmed by the expert)
// router.patch("/session/:sessionId/accept", acceptSession);

// // Route for declining a session (Rejected by the expert)
// router.patch("/session/:sessionId/decline", declineSession);

export default router;
