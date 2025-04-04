import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true,
    },
},{timestamps:true})

const AdminLogin = mongoose.model("AdminLogin",adminSchema)

export default adminSchema

