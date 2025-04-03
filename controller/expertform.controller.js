import Expert from "./model/expertform.model.js"; // Update to Expert model
import fs from "fs";
import path from "path";

export const createExpert = async (req, res) => {
  try {
    const { firstName, lastName, email, gender, mobile, socialLink, areaOfExpertise, experience } = req.body;

    // Check if required files are uploaded
    if (!req.files || !req.files.certification || !req.files.photo) {
      return res.status(400).json({ success: false, message: "Both certificate and photo files are required" });
    }

    const certificatePath = req.files.certification[0].path;
    const photoPath = req.files.photo[0].path;

    const newExpert = new Expert({
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

    await newExpert.save();

    res.status(201).json({
      success: true,
      message: "Expert created successfully",
      data: newExpert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all experts
export const getExperts = async (req, res) => {
  try {
    const experts = await Expert.find();  // Changed from User to Expert
    res.status(200).json({
      success: true,
      data: experts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single expert by ID
export const getExpertById = async (req, res) => {
  try {
    const expert = await Expert.findById(req.params.id);  // Changed from User to Expert

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    res.status(200).json({
      success: true,
      data: expert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
