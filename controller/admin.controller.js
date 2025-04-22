import {Admin} from '../model/admin.model.js'
import { Expert } from '../model/expert.model.js';
import dotenv from 'dotenv';

dotenv.config()

 const loginAdmin = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email and password are required.' });
  }

  // Simple check against our single user
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    // (Optionally issue a JWT or set a session here)
    return res.status(200).json({ message: 'Login successful!' });
  } else {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
};

// Approve or reject an expert
const updateExpertStatus = async (req, res) => {
  const { expertId } = req.params;
  const { status } = req.body;

  // Only allow "Approved" or "Rejected"
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const updatedExpert = await Expert.findByIdAndUpdate(
      expertId,
      { status },
      { new: true }
    );

    if (!updatedExpert) {
      return res.status(404).json({ success: false, message: 'Expert not found' });
    }

    res.status(200).json({
      success: true,
      message: `Expert ${status.toLowerCase()} successfully`,
      data: updatedExpert,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export {loginAdmin, updateExpertStatus}
