import { Expert } from '../model/expert.model.js';
import twilio from 'twilio';
import dotenv from 'dotenv';
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { upload } from '../middleware/multer.middleware.js';

import mongoose from "mongoose";
import cloudinary from 'cloudinary';
import streamifier from 'streamifier';
import nodemailer from 'nodemailer';
import { User } from '../model/user.model.js';
dotenv.config();

// LinkedIn URL validation function
const validateLinkedInLink = (link) => {
  const linkedinPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/;
  return linkedinPattern.test(link);
};

const transporterForOtp = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const transporterForAdminApproval = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper functions
const normalizePhoneNumber = (phone) => phone.replace(/[^\d]/g, "");
const sendOtp = async (phone) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit OTP
    await client.messages.create({
      body: `Your verification code is: ${otp}`, // ✅ Fixed string interpolation
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to ${phone}`); // ✅ Fixed console log
    return otp;
  } catch (error) {
    console.error("Error sending OTP via Twilio:", error);
    throw new ApiError(500, "Failed to send OTP");
  }
};

const checkUserExists = async (email, phone) => {
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;
  
  const user = await User.findOne({
    $or: [
      { email },
      ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
    ]
  });

  if (user) {
    const duplicateField = user.email === email ? 'email' : 'phone';
    throw new ApiError(400, `This ${duplicateField} is registered as an user. Please use a different ${duplicateField}.`);
  }
};

const requestOtp = asyncHandler(async (req, res) => {
  const { phone, email } = req.body;

  // Check if either phone or email is provided
  if (!phone && !email) throw new ApiError(400, "Phone or email is required");

  await checkUserExists(email, phone);

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

  let expert = null;
  let isNewExpert = true;

  // Handle phone login
  if (phone) {
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check if expert exists with this phone
    expert = await Expert.findOne({ phone: normalizedPhone });
    isNewExpert = !expert?.email; // Check if email is not set, meaning it's a new expert

    

    if (expert) {
      // Update existing expert's OTP
      expert.otp = otp;
      expert.otpExpires = otpExpires;
    } else {
      // Create a new expert if none exists
      expert = new Expert({
        phone: normalizedPhone,
        otp,
        otpExpires,
        role: "expert",
        status: "Pending"
      });
    }

    // Send OTP via Twilio for phone login
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to phone: ${phone}`);
  }

  // Handle email login
  else if (email) {
    // Check if expert exists with this email
    expert = await Expert.findOne({ email });
    isNewExpert = !expert?.phone; // Check if phone is not set, meaning it's a new expert

    if (expert) {
      // Update existing expert's OTP
      expert.otp = otp;
      expert.otpExpires = otpExpires;
    } else {
      // Create a new expert if none exists
      expert = new Expert({
        email,
        otp,
        otpExpires,
        role: "expert",
        status: "Pending"
      });
    }

    // Send OTP via email for email login
    const mailOptions = {
      from: `"Shourk Support" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your verification code is: <b>${otp}</b></p>`,
    };

    await transporterForOtp.sendMail(mailOptions);
    console.log(`OTP sent to email: ${email}`);
  }

  // Save the expert data to the database
  await expert.save();

  

 

  // Respond with success message
  res.status(200).json(new ApiResponse(200, { isNewExpert }, "OTP sent successfully"));
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, email, otp } = req.body;
  if ((!phone && !email) || !otp) {
    throw new ApiError(400, "Phone or Email and OTP are required");
  }

  let expert;

  if (phone) {
    const normalizedPhone = normalizePhoneNumber(phone);
    expert = await Expert.findOne({ phone: normalizedPhone });
  } else if (email) {
    expert = await Expert.findOne({ email });
  }

  if (!expert || expert.otp !== otp || new Date() > expert.otpExpires) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // OTP is valid – clear it
  expert.otp = undefined;
  expert.otpExpires = undefined;
  await expert.save();

  
// Check if registration is complete
if (expert.firstName && expert.lastName && expert.email) {
  // Check if expert's account is approved
  if (expert.status !== "Approved") {
    throw new ApiError(403, "Your account is pending approval. Please wait for admin approval before logging in.");
  }
    
    
    const token = jwt.sign(
      {
        _id: expert._id,
        role: "expert",
        status: "Approved",
        ...(phone && { phone: expert.phone }),  // Include phone only if available
        ...(email && { email: expert.email }),  // Include email only if available
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, { isNewExpert: false, token }, "OTP verified - login successful"));
  }

  // Registration not complete, return data to complete the registration
  return res
    .status(200)
    .json(new ApiResponse(200, { isNewExpert: true }, "OTP verified - complete registration"));
});



// Merged registerExpert Controller
// const registerExpert = asyncHandler(async (req, res) => {
//   const { email, firstName, lastName, gender, phone, socialLink, areaOfExpertise, experience, category } = req.body;
//   const files = req.files;

//   // Validate required fields (excluding phone)
//   if (!firstName || !lastName || !email || !gender) {
//     throw new ApiError(400, 'All fields are required');
//   }

//   // Validate profile fields (optional, but must be filled in case of profile completion)
//   if (!socialLink || !areaOfExpertise || !experience) {
//     throw new ApiError(400, 'Social link, area of expertise, and experience are required');
//   }

//   // Normalize phone number and find expert by phone
//   const normalizedPhone = phone.replace(/[^\d]/g, "");
//   let expert = await Expert.findOne({ phone: normalizedPhone });

//   // If expert exists but isn't fully registered (no email, firstName, or lastName)
//   if (expert && !expert.email) {
//     expert.firstName = firstName;
//     expert.lastName = lastName;
//     expert.email = email;
//     expert.gender = gender;

//     expert.socialLink = socialLink;
//     expert.areaOfExpertise = areaOfExpertise;
//     expert.experience = experience;
//     expert.category = category;  // Save category field

//     // Save the certification and photo files if available
//     if (files?.certification?.[0]) {
//       expert.certificationFile = files.certification[0].path;
//     }
//     if (files?.photo?.[0]) {
//       expert.photoFile = files.photo[0].path;
//     }

//     await expert.save();

//     return res.status(201).json(new ApiResponse(201, expert, 'Expert registered and profile completed successfully.'));
//   }

//   // If expert does not exist, create a new record
//   if (!expert) {
//     expert = new Expert({
//       phone: normalizedPhone,
//       firstName,
//       lastName,
//       email,
//       gender,
//       socialLink,
//       areaOfExpertise,
//       experience,
//       category,  // Save category field
//       role: 'expert',
//     });

//     // Save the certification and photo files if available
//     // if (files?.certification?.[0]) {
//     //   expert.certificationFile = files.certification[0].path;
//     // }
//     // if (files?.photo?.[0]) {
//     //   expert.photoFile = files.photo[0].path;
//     // }

//     await expert.save();
//     return res.status(201).json(new ApiResponse(201, expert, 'Expert registered successfully'));
//   }

//   // If expert already has email or full registration data
//   throw new ApiError(400, 'Expert already registered');
// });


// Configure Cloudinary using your credentials (ideally use environment variables)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, //|| 'dctmzawgj',
  api_key: process.env.CLOUDINARY_API_KEY,// || '517938482585331',
  api_secret: process.env.CLOUDINARY_API_SECRET,// || 'i6XCN0_E4JGeoTSJQU5uK0c9odw'
});

// Helper function to upload a file buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, folder, resource_type = 'image') => {
  return new Promise((resolve, reject) => {
    // Check the file type (MIME type)
    if (resource_type === 'image') {
      const mimeType = fileBuffer.mimetype;
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(mimeType)) {
        return reject(new Error("Invalid image file"));
      }
    }

    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder, resource_type: 'auto',
        transformation: [
          { width: 800, height: 800, crop: 'limit' }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer.buffer).pipe(uploadStream);
  });
};


// Controller to handle expert registration with file uploads
// LinkedIn URL validation function
// const validateLinkedInLink = (link) => {
//   const linkedinPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/;
//   return linkedinPattern.test(link);
// };

const registerExpert = async (req, res) => {
  try {
    // Log the received files
    console.log('Received files:', req.files);

    // Extract data from the request body
    const {
      email,
      firstName,
      lastName,
      gender,
      phone,
      socialLink,
      areaOfExpertise,
      specificArea,
      experience,
      price
    } = req.body;

    // Validate LinkedIn URL if socialLink (LinkedIn) is provided
    if (socialLink && !validateLinkedInLink(socialLink)) {
      throw new ApiError(400, "Please enter a valid LinkedIn link.");
    }

    // Handle the file upload process
    let photoUrl = null;


    let certificationUrl = null;

    // If photo file is provided
    if (req.files && req.files.photoFile && req.files.photoFile[0]) {
      const photoFile = req.files.photoFile[0];
      const photoResult = await uploadToCloudinary(photoFile, 'experts/photos');
      photoUrl = photoResult.secure_url;
    }

    // If certification file is provided
    if (req.files && req.files.certificationFile && req.files.certificationFile[0]) {
      const certFile = req.files.certificationFile[0];
      const certResult = await uploadToCloudinary(certFile, 'experts/certifications', 'raw');
      certificationUrl = certResult.secure_url;
    }

    // Validate required fields (excluding phone)
    if (!firstName || !lastName || !email || !gender) {
      throw new ApiError(400, 'All fields are required');
    }

    // Validate profile fields (optional, but must be filled in case of profile completion)
    if (!socialLink || !areaOfExpertise || !experience) {
      throw new ApiError(400, 'Social link, area of expertise, and experience are required');
    }

    // Normalize phone number and find expert by phone
    const normalizedPhone = phone.replace(/[^\d]/g, "");
    let expert = await Expert.findOne({ phone: normalizedPhone });

    // If expert exists but isn't fully registered (no email, firstName, or lastName)
    if (expert && !expert.email) {
      expert.firstName = firstName;
      expert.lastName = lastName;
      expert.email = email;
      expert.gender = gender;

      expert.socialLink = socialLink;
      expert.areaOfExpertise = areaOfExpertise;
      expert.experience = experience;
      expert.price = price;
      expert.photoFile = photoUrl;
      expert.certificationFile = certificationUrl;
      // Save category field

      await expert.save();

      // Send registration confirmation email
  try {
    const mailOptionsForAdmin = {
      from: `"Shourk Support" <${process.env.MAIL_USER}>`,
      to: expert.email,
      subject: "Registration Submitted Successfully",
      html: `<p>Dear ${expert.firstName},</p>
             <p>Your registration has been submitted successfully. Please wait for admin approval before you can log in.</p>
             <p>Thank you for your patience.</p>`,
    };

    await transporterForAdminApproval.sendMail(mailOptionsForAdmin);
    console.log(`Registration confirmation email sent to ${expert.email}`);
  } catch (emailError) {
    console.error("Error sending registration email:", emailError);
  }

      return res.status(201).json(new ApiResponse(201, expert, 'Expert registered and profile completed successfully.'));
    }

    // If expert does not exist, create a new record
    // Check for existing expert by email (main identity from login)
    if (!expert) {
      expert = await Expert.findOne({ email });
    }

    // If expert exists and is already fully registered, block re-registration
    if (expert && expert.firstName && expert.lastName && expert.areaOfExpertise) {
      throw new ApiError(400, "This expert is already registered.");
    }

    // If expert exists but is partially registered (we update it)
    if (expert) {
      expert.firstName = firstName;
      expert.lastName = lastName;
      expert.gender = gender;
      expert.phone = phone;
      expert.socialLink = socialLink;
      expert.areaOfExpertise = areaOfExpertise === "Others" ? specificArea : areaOfExpertise;
      expert.experience = experience;
      expert.price = price;
      expert.photoFile = photoUrl;
      expert.certificationFile = certificationUrl;
      expert.status = "Pending";
    } else {
      // If still not found, create a new one
      expert = new Expert({
        email,
        firstName,
        lastName,
        gender,
        phone,
        socialLink,
        areaOfExpertise: areaOfExpertise === "Others" ? specificArea : areaOfExpertise,
        experience,
        price,
        photoFile: photoUrl,
        certificationFile: certificationUrl,
        role: "expert",
        status: "Pending",
      });
    }

    await expert.save();
    res.status(201).json({ message: "Expert registered successfully", expert });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Server Error: " + error.message });
  }
};

// Add this to your expertauth.controller.js file
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const expert = await Expert.findById(decoded._id);
    
    if (!expert) {
      return res.status(404).json({ message: "Expert not found" });
    }
    
    const newToken = jwt.sign(
      { _id: expert._id, email: expert.email, role: "expert" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});


const logoutExpert = asyncHandler(async (req, res) => {
  await Expert.findByIdAndUpdate(
    req.expert._id,
    {
      $unset: {
        token: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("token", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});



const getExperts = asyncHandler(async (req, res) => {
  try {
    const experts = await Expert.find(); // Fetch all experts
    res.status(200).json(new ApiResponse(200, experts, "Experts retrieved"));
  } catch (error) {
    console.error("Error fetching experts:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching experts.",
      error: error.message,
    });
  }
});


const getExpertById = asyncHandler(async (req, res) => {
  const expertId = req.params.id;

  // Convert expertId to ObjectId before querying the database
  const objectId = new mongoose.Types.ObjectId(expertId);

  const expert = await Expert.findById(objectId);
  if (!expert) throw new ApiError(404, "Expert not found");
  res.status(200).json(new ApiResponse(200, expert, "Expert retrieved"));
});

// Fetch experts by area of expertise
const getExpertsByArea = asyncHandler(async (req, res) => {
  const { area } = req.params;

  const experts = await Expert.find({ areaOfExpertise: area });

  if (experts.length === 0) {
    return res.status(404).json(new ApiResponse(404, [], "No experts found for this area"));
  }

  res.status(200).json(new ApiResponse(200, experts, "Experts fetched successfully"));
});



// Controller for updating the charity settings
const updateExpertCharity = async (req, res) => {
  try {
    // Extract the token from the Authorization header (Bearer <token>)
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Decode the token to get the expert _id
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded || !decoded._id) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Now we have the expert's MongoDB ObjectId (_id) from the decoded token
    const expertId = decoded._id;

    // Find the expert by MongoDB ObjectId
    const expert = await Expert.findById(expertId);

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    // Proceed to update the charity information
    const { charityEnabled, charityPercentage, charityName } = req.body;

    // Update the charity settings for this expert
    expert.charityEnabled = charityEnabled;
    expert.charityPercentage = charityPercentage;
    expert.charityName = charityName;

    // Save the updated expert data
    await expert.save();

    res.status(200).json({
      success: true,
      message: "Charity settings updated successfully",
      data: expert,
    });
  } catch (error) {
    console.error("Error updating charity settings:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating charity settings.",
      error: error.message,
    });
  }
};

const updateExpertPrice = async (req, res) => {
  try {
    const { price } = req.body;
    const expertId = req.headers.expertid;

    if (!expertId) {
      return res.status(400).json({
        success: false,
        message: "Expert ID is required",
      });
    }

    const expert = await Expert.findByIdAndUpdate(
      expertId,
      { price },
      { new: true }
    );

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Price updated successfully",
      data: { price: expert.price },
    });
  } catch (error) {
    console.error("Error updating expert price:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth();
  if (
    month < birthDate.getMonth() ||
    (month === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};

const updateExpert= async (req, res) => {
  try {
    const expertId = req.body._id || req.params.id;

    if (!expertId) {
      return res.status(400).json({ message: "Expert ID is required" });
    }

    const expert = await Expert.findById(expertId);

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      areaOfExpertise,
      dateOfBirth,
    } = req.body;

    if (firstName) expert.firstName = firstName;
    if (lastName) expert.lastName = lastName;
    if (email) expert.email = email;
    if (phone) expert.phone = phone;
    if (areaOfExpertise) expert.areaOfExpertise = areaOfExpertise;
    if (dateOfBirth) {
      expert.dateOfBirth = dateOfBirth;
      expert.age = calculateAge(dateOfBirth);
    }

    await expert.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: expert,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating profile.",
      error: error.message,
    });
  }
};



const updateExpertExperience = async (req, res) => {
  try {
    const expertId = req.body._id || req.params.id;

    if (!expertId) {
      return res.status(400).json({ message: "Expert ID is required" });
    }

    const expert = await Expert.findById(expertId);

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    const { aboutMe, advice } = req.body;

    // Map aboutMe to experience field in the database
    if (aboutMe !== undefined) expert.experience = aboutMe;

    // Handle advice array updates
    if (Array.isArray(advice)) {
      // Filter out empty strings from the incoming advice array
      const filteredAdvice = advice.filter(item => item && item.trim() !== "");
      
      // Replace the entire advice array with the filtered version
      // This will handle both additions and deletions as the frontend
      // is sending the complete updated array
      expert.advice = filteredAdvice;
    }

    await expert.save();

    res.status(200).json({
      success: true,
      message: "About section updated successfully",
      data: {
        experience: expert.experience,
        advice: expert.advice,
      },
    });
  } catch (error) {
    console.error("Error updating about section:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the about section.",
      error: error.message,
    });
  }
};


export {
  requestOtp,
  verifyOtp,
  registerExpert,
  getExperts,
  getExpertById,
  logoutExpert,
  getExpertsByArea,
  updateExpertCharity,
  updateExpertPrice,
  updateExpert,
  updateExpertExperience,
  refreshToken
};
