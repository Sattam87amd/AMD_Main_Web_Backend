// import mongoose from "mongoose";
// import bcrypt from "bcryptjs"; // Make sure to import bcrypt

// const adminSchema = new mongoose.Schema({
//     email: {
//         type: String,
//         required: true,
//     },
//     password: {
//         type: String,
//         required: true,
//     },
// }, { timestamps: true });

// // Hash the password before saving to the database
// adminSchema.pre('save', async function (next) {
//     if (this.isModified('password')) {
//         this.password = await bcrypt.hash(this.password, 10); // Hash the password
//     }
//     next();
// });

// export const Admin = mongoose.model("Admin", adminSchema);
