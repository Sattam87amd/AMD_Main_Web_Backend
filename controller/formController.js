import User from "../model/formModel.js";
import fs from "fs";
import path from "path";

export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, gender, mobile, socialLink, areaOfExpertise, experience } = req.body;

    // Check if required files are uploaded
    if (!req.files || !req.files.certification || !req.files.photo) {
      return res.status(400).json({ success: false, message: "Both certificate and photo files are required" });
    }

    const certificatePath = req.files.certification[0].path;
    const photoPath = req.files.photo[0].path;

    const newUser = new User({
      firstName,
      lastName,
      email,
      gender,
      mobile,
      socialLink,
      areaOfExpertise,
      experience,
      certificationFile: certificatePath,
      photoFile: photoPath
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
