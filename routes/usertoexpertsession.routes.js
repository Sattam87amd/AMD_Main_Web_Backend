import { Router } from 'express';
import { bookSession } from '../controller/usertoexpertsession.controller.js';
const router = Router();

router.post('/usertoexpertsession', bookSession);

export default router;
