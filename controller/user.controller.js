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

export const searchUser = async (req, res) => {
  console.log("search USers");
  try {
    const { q } = req.query;
    console.log(q);

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // 1️⃣ Search users from DB (NO online filter)
    const users = await UserModel.find({
      $or: [{ username: { $regex: q, $options: "i" } }],
    }).select("-password");

    // 2️⃣ Get online user IDs from socket memory
    const onlineUserIds = Array.from(onlineUsers.keys());

    // 3️⃣ Attach online status to each user
    const usersWithStatus = users.map((user) => ({
      ...user.toObject(),
      isOnline: onlineUserIds.includes(user._id.toString()),
    }));

    res.status(200).json({
      users: usersWithStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
