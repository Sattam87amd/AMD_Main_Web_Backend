import { UserToExpertSession } from "../model/usertoexpertsession.model.js";
import { ExpertToExpertSession } from "../model/experttoexpertsession.model.js";
import Rating from "../model/rating.model.js";



const getAllSessions = async (req, res) => {
  try {
    // Fetch user-to-expert sessions
    const userSessions = await UserToExpertSession.find()
      .populate('userId expertId')
      .lean();

    // Fetch expert-to-expert sessions
    const expertSessions = await ExpertToExpertSession.find()
      .populate('consultingExpertID expertId')
      .lean();

    // Add formatted sessionDate (IST timezone) + duration + comment for user-to-expert sessions
    const formattedUserSessions = await Promise.all(userSessions.map(async (session) => {
      const rating = await Rating.findOne({ sessionId: session._id }).lean();
      return {
        ...session,
        sessionDate: session.createdAt
          ? new Date(session.createdAt).toLocaleString('en-GB', { 
              timeZone: 'Asia/Kolkata', 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: true 
            })
          : null,
        duration: session.duration || null,   // from UserToExpertSession model
        comment: rating?.comment || null,      // from Rating model
      };
    }));

    // Add formatted sessionDate (IST timezone) + duration + comment for expert-to-expert sessions
    const formattedExpertSessions = await Promise.all(expertSessions.map(async (session) => {
      const rating = await Rating.findOne({ Id: session._id }).lean();
      return {
        ...session,
        sessionDate: session.createdAt
          ? new Date(session.createdAt).toLocaleString('en-GB', { 
              timeZone: 'Asia/Kolkata', 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: true 
            })
          : null,
        duration: session.duration || null,   // from ExpertToExpertSession model
        comment: rating?.comment || null,      // from Rating model
      };
    }));

    // Return both formatted session lists
    res.status(200).json({
      success: true,
      userToExpertSessions: formattedUserSessions,
      expertToExpertSessions: formattedExpertSessions,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};






export default getAllSessions