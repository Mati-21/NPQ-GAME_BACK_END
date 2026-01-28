import UserModel from "../model/user.model.js";
import { onlineUsers } from "../Socket/handlers/index.js";

export const getOnlineUsers = async (req, res) => {
  console.log("so");
  try {
    // 1️⃣ Read presence from socket layer
    const onlineUserIds = Array.from(onlineUsers.keys());

    // 2️⃣ Fetch details from DB
    const users = await UserModel.find({
      _id: { $in: onlineUserIds },
    }).select("-password");

    res.status(200).json({
      success: true,
      users,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
