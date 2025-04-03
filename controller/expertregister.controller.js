import ExpertRegister from '../model/expertregister.model.js'; // Changed to ExpertRegister model

// Register Expert
export const registerExpert = async (req, res) => {
  const { email, firstName, lastName, gender, mobile } = req.body;

  if (!email || !firstName || !lastName || !gender || !mobile) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Log the phone number to confirm it's being received correctly
  console.log('Received phone number for registration:', mobile);

  try {
    const existingExpert = await ExpertRegister.findOne({ email });

    if (existingExpert) {
      return res.status(400).json({ message: 'Expert already registered' });
    }

    const newExpert = await ExpertRegister.create({ email, firstName, lastName, gender, mobile });
    res.status(201).json({ message: 'Expert registered successfully', expert: newExpert });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// Get All Experts
export const getAllExperts = async (req, res) => {
  try {
    const experts = await ExpertRegister.find(); // Changed to ExpertRegister model
    res.status(200).json(experts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
