import { Router } from 'express';
import { bookSession } from '../controller/usertoexpertsession.controller.js';
<<<<<<< HEAD
const router_usertoexpert = Router();
=======
const router = Router();
>>>>>>> fa12fb33286654705c8f93135eeb0f646685b649

router.post('/usertoexpertsession', bookSession);

export default router;
