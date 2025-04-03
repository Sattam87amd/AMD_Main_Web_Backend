import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import connectDB from './db/db_config.js'; // Database configuration import
import formRoutes from './routes/expertform.Routes.js';
import loginRoutes from './routes/expertlogin.Routes.js';
import registerRoutes from './routes/expertregister.Routes.js';
import userrouter from './routes/userlogin.route.js';


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
app.use('/api/forms', formRoutes);
app.use('/api/auth', loginRoutes);
app.use('/api/userauth', userrouter);
app.use('/api/register', registerRoutes);

// Define the Port
const PORT = process.env.PORT || 5000;

// Start the Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
