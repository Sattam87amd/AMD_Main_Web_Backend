import express from 'express';
import { registerUser, getAllUsers } from '../controller/registerController.js';

const router = express.Router();

router.post('/', registerUser);
router.get('/', getAllUsers);

export default router;
