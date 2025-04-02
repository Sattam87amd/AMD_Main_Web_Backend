import Register from '../model/registerModel.js';

// Register User

export const registerUser = async (req, res) => {
    const { email, firstName, lastName, gender, mobile } = req.body;
  
    if (!email || !firstName || !lastName || !gender || !mobile) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    // Log the phone number to confirm it's being received correctly
    console.log('Received phone number for registration:', mobile);
  
    try {
      const existingUser = await Register.findOne({ email });
  
      if (existingUser) {
        return res.status(400).json({ message: 'User already registered' });
      }
  
      const newUser = await Register.create({ email, firstName, lastName, gender, mobile });
      res.status(201).json({ message: 'User registered successfully', user: newUser });
  
    } catch (error) {
      res.status(500).json({ message: 'Server Error', error });
    }
  };
  

// Get All Users
export const getAllUsers = async (req, res) => {
    try {
        const users = await Register.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
