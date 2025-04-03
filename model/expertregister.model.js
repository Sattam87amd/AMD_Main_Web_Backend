import mongoose from 'mongoose';

const registerSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Prefer not to'],
        required: [true, 'Gender is required'],
    },
}, {
    timestamps: true,
});

const ExpertRegister = mongoose.model('ExpertRegister', registerSchema); // Change model name to ExpertRegister

export default ExpertRegister;
