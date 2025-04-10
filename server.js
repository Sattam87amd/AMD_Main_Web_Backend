import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import connectDB from './db/db_config.js'; // Database configuration import
import expertRouter from './routes/expert.routes.js';
import userRouter from './routes/user.Route.js';
import VerifyJwt from './middleware/auth.middleware.js';
import  usertoexpertsessionRouter from './routes/usertoexpertsession.routes.js';
import  experttoexpertsessionRouter from './routes/experttoexpertsession.routes.js';
// import adminRouter from "./routes/admin.routes.js"
import { ExpertToExpertSession } from './model/experttoexpertsession.model.js';
import zoomRouter from '../AMD_Main_Web_Backend/routes/zoom.routes.js'
// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse incoming JSON data

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Connect to MongoDB (now Compass via local MongoDB URI)
connectDB();

// Default Test Route
app.get('/', (req, res) => {
  res.send('🚀 Server is running and MongoDB is connected!');
});

// API Routes
// app.use('/api/forms', formRoutes);
// app.use('/api/auth', loginRoutes);
// app.use('/api/register', registerRoutes);

// app.use('/api/user', userrouter)
// app.use('/api/expert', expertrouter)
// app.use('/api/admin', adminrouter)

app.use('/api/userauth', userRouter);
app.use('/api/expertauth', expertRouter);
// app.use('/api/admin', adminRouter);
// app.use('/api/adminauth', adminRouter);
app.use('/api/zoom', zoomRouter);
    

app.use('/api/session', VerifyJwt, usertoexpertsessionRouter,experttoexpertsessionRouter)


// Define the Port
const PORT = process.env.PORT || 5000;

// Start the Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
