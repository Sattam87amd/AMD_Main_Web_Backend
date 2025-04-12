import { Expert } from '../model/expert.model.js';
import twilio from 'twilio';
import dotenv from 'dotenv';
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { upload } from '../middleware/multer.middleware.js';
import { User } from "../model/user.model.js"; 
import mongoose from "mongoose";
import cloudinary from 'cloudinary';
import streamifier from 'streamifier';
import nodemailer from 'nodemailer';
dotenv.config();

// LinkedIn URL validation function
const validateLinkedInLink = (link) => {
  const linkedinPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/;
  return linkedinPattern.test(link);
};

const transporter = nodemailer.createTransport({
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

const requestOtp = asyncHandler(async (req, res) => {
  const { phone, email } = req.body;
  if (!phone && !email) throw new ApiError(400, "Phone or email is required");

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  let expert = null;
  let isNewExpert = true;

  // When phone login
  if (phone) {
    const normalizedPhone = normalizePhoneNumber(phone);

    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) throw new ApiError(400, "You've already registered as a user with this number");

    expert = await Expert.findOne({ phone: normalizedPhone });
    isNewExpert = !expert?.email;

    if (expert) {
      expert.otp = otp;
      expert.otpExpires = otpExpires;
    } else {
      expert = new Expert({
        phone: normalizedPhone,
        otp,
        otpExpires,
        role: "expert",
        status: "Approved"
      });
    }

    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to phone: ${phone}`);
  }

  // When email login
  else if (email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new ApiError(400, "You've already registered as a user with this email");

    expert = await Expert.findOne({ email });
    isNewExpert = !expert?.phone;

    if (expert) {
      expert.otp = otp;
      expert.otpExpires = otpExpires;
    } else {
      expert = new Expert({
        email,
        otp,
        otpExpires,
        role: "expert",
        status: "Approved"
      });
    }

    // Send email
    const mailOptions = {
      from: `"AMD Expert Portal" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your verification code is: <b>${otp}</b></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to email: ${email}`);
  }

  await expert.save();

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
    const token = jwt.sign(
      {
        _id: expert._id,
        role: "expert",
        status: "Approved",
        ...(phone && { phone: expert.phone }),
        ...(email && { email: expert.email }),
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, { isNewExpert: false, token }, "OTP verified - login successful"));
  }

  // Registration not complete
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
      { folder, resource_type: 'auto',
        transformation: [
          { width: 800, height: 800, crop: 'limit' } ]
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
      expert.price= price;
      expert.photoFile = photoUrl;
      expert.certificationFile = certificationUrl;
      // Save category field

      await expert.save();

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
      expert.price=price;
      expert.photoFile = photoUrl;
      expert.certificationFile = certificationUrl;
      expert.status = "Approved";
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
        status: "Approved",
      });
    }

    await expert.save();
    res.status(201).json({ message: "Expert registered successfully", expert });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Server Error: " + error.message });
  }
};


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
  const experts = await Expert.find();
  res.status(200).json(new ApiResponse(200, experts, "Experts retrieved"));
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

export {
requestOtp,
verifyOtp,
registerExpert,
getExperts,
getExpertById,
logoutExpert,
getExpertsByArea
};
