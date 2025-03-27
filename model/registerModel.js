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
}, {
    timestamps: true,
});

const Register = mongoose.model('Register', registerSchema);

export default Register;
