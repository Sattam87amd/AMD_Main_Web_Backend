
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
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const userId = decodedToken.id;
    const userRole = decodedToken.role; // assuming your token payload has `role`

    const { sessionId, reasons, otherReason } = req.body;
    console.log("Session ID:", sessionId);
    let session = "";
    let sessionModel = "";

    if (userRole === "user") {
      session = await UserToExpertSession.findOne({ _id: sessionId, userId });
      sessionModel = "UserToExpertSession";
    } else if (userRole === "expert") {
      session = await ExpertToExpertSession.findOne({ _id: sessionId, userId });
      sessionModel = "ExpertToExpertSession";
    } else {
      return res.status(400).json({ success: false, message: "Invalid role in token" });
    }
    console.log("Session found:", session);
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
      userId,
      userModel: userRole === "expert" ? "Expert" : "User",
      reasons,
      otherReason,
      cancellationTime: now,
      policyApplied: cancellationFee,
    });

    await cancelEntry.save();

    // Delete session from correct model
    const SessionModel = sessionModel === "UserToExpertSession" ? UserToExpertSession : ExpertToExpertSession;
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