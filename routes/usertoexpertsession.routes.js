import { Router } from 'express';
import { bookSession } from '../controller/usertoexpertsession.controller.js';
import VerifyJwt from '../middleware/auth.middleware.js';
const router = Router();

router.post('/usertoexpertsession',VerifyJwt, bookSession);

export default router;
