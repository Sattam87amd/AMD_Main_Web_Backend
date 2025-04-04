import express from 'express';
import { Router } from 'express';
import { bookSession } from '../controller/usertoexpertsession.controller.js';
const router_usertoexpert = Router();

router_usertoexpert.post('/usertoexpertsession', bookSession);

export {router_usertoexpert}
