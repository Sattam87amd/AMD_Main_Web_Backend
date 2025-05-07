
import jwt from "jsonwebtoken";
import { UserToExpertSession } from "../model/usertoexpertsession.model.js";
import { ExpertToExpertSession } from "../model/experttoexpertsession.model.js";
import { Cancel } from "../model/cancel.model.js";

const cancelSession = async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ success: false, message: "Token is required" });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const Id = decodedToken._id;
    const Role = decodedToken.role;

    const { sessionId, reasons, otherReason, sessionModel } = req.body; // Destructure sessionModel from req.body

    let session;
    let SessionModel;

    // Determine the model and query based on sessionModel from request
    switch (sessionModel) {
      case "ExpertToExpertSession":
        SessionModel = ExpertToExpertSession;
        session = await SessionModel.findOne({ 
          _id: sessionId, 
          consultingExpertID: Id // Correct field name for expert in ExpertToExpertSession
        });
        break;
      case "UserToExpertSession":
        SessionModel = UserToExpertSession;
        // Check if the user is the expert (expertID) or the user (userId) based on their role
        const query = Role === "expert" 
          ? { _id: sessionId, expertId: Id } 
          : { _id: sessionId, userId: Id };
        session = await SessionModel.findOne(query);
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid session model" });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or you don't have permission to cancel it.",
      });
    }

    // Calculate cancellation policy
    const sessionDateTime = new Date(session.slots.sessionDate + ' ' + session.slots.sessionTime);
    const now = new Date();
    const hoursDifference = (sessionDateTime - now) / (1000 * 60 * 60);
    const cancellationFee = hoursDifference < 24 ? "Cancellation fee may apply" : "No cancellation fee";

    // Save to Cancel model
    const cancelEntry = new Cancel({
      sessionId,
      sessionModel,
      Id,
      userModel: Role === "expert" ? "Expert" : "User",
      reasons,
      otherReason,
      cancellationTime: now,
      policyApplied: cancellationFee,
    });

    await cancelEntry.save();

    // Delete session from the correct model (already determined by sessionModel)
    await SessionModel.deleteOne({ _id: sessionId });

    return res.status(200).json({
      success: true,
      message: "Session cancelled and deleted successfully.",
      cancellationFee,
    });

  } catch (error) {
    console.error("Error cancelling session:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default cancelSession 