import { Router } from 'express';
import VerifyJwt from '../middleware/auth.middleware.js';
import { bookExpertToExpertSession } from '../controller/experttoexpertsession.controller.js';
const router = Router();

router.post('/experttoexpertsession',VerifyJwt, bookExpertToExpertSession);

export default router;
