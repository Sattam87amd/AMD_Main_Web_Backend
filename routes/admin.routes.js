import express from 'express';

import { Router } from 'express';
import { loginAdmin, updateExpertStatus } from '../controller/admin.controller.js';



const router = Router();

router.post('/login',loginAdmin )
router.put('/experts/:expertId/status', updateExpertStatus);
export default router;