import { UserToExpertSession } from "../model/usertoexpertsession.model.js";
import { ExpertToExpertSession } from "../model/experttoexpertsession.model.js";

const getAllSessions = async (req, res) => {
    try {
      // Fetch user to expert sessions
      const userSessions = await UserToExpertSession.find().populate('userId expertId');
  
      // Fetch expert to expert sessions
      const expertSessions = await ExpertToExpertSession.find().populate('consultingExpertID expertId');
  
      res.status(200).json({
        success: true,
        userToExpertSessions: userSessions,
        expertToExpertSessions: expertSessions,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

export default getAllSessions