import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import connectDB from './db/db_config.js'; // Database configuration import
import expertRouter from './routes/expert.routes.js';
import userRouter from './routes/user.Route.js';
import VerifyJwt from './middleware/auth.middleware.js';
import usertoexpertsessionRouter from './routes/usertoexpertsession.routes.js';
import experttoexpertsessionRouter from './routes/experttoexpertsession.routes.js';
import { ExpertToExpertSession } from './model/experttoexpertsession.model.js';
import zoomRouter from './routes/zoom.routes.js';
import chatRoutes from './routes/chat.routes.js';
import ratingRoutes from './routes/rating.routes.js'; // <-- Import the rating routes
import { getExperts } from './controller/expert.controller.js';
import adminRoutes from './routes/admin.routes.js';
import sessionRoutes from './routes/session.routes.js';
import axios from 'axios'; // <-- Import axios

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
app.use('/api/userauth', userRouter);
app.use('/api/expertauth', expertRouter);
app.use('/api/adminauth', adminRoutes);
app.use('/api/chatbot', chatRoutes);
app.use('/api/zoom', zoomRouter);
app.use('/api/usersession', VerifyJwt, usertoexpertsessionRouter);
app.use('/api/session', VerifyJwt, experttoexpertsessionRouter, usertoexpertsessionRouter);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ratings', ratingRoutes);

// Add the countries route here
app.get('/api/countries', async (req, res) => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all'); // Using Restcountries API
    const countries = response.data.map(country => country.name.common); // Extracting the country names
    res.json(countries); // Return the list of countries as a JSON response
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ message: 'Error fetching countries' });
  }
});

// Define the Port
const PORT = process.env.PORT || 5000;

// Start the Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
