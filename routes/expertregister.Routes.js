import express from 'express';
import { registerExpert, getAllExperts } from '../controller/expertregister.controller.js';

const router = express.Router();

router.post('/', registerExpert);
router.get('/', getAllExperts);

export default router;
