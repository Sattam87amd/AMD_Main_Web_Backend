import User from "../model/formModel.js";
import fs from "fs";
import path from "path";

export const createUser = async (req, res) => {
  try {
    const { socialMediaLink, areaOfExpertise, experience } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Certificate PDF is required" });
    }
    const certificatePath = req.file.path;

    const newUser = new User({
      socialMediaLink,
      areaOfExpertise,
      experience,
      certificate: certificatePath,
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

