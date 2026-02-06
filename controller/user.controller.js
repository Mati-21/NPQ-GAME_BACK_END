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

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.find({}).select("-password");
    res.status(200).json({
      Number_Of_Users: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

import mongoose from "mongoose";

export const getSomeUsers = async (req, res, next) => {
  console.log("getsomeuser");

  try {
    const { usersId } = req.body;

    // 1️⃣ Validate input
    if (!usersId || !Array.isArray(usersId) || usersId.length === 0) {
      return res.status(400).json({
        error: "Please provide an array of user IDs",
      });
    }

    // 2️⃣ Convert string IDs to ObjectId instances
    const validIds = usersId
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        error: "No valid user IDs provided",
      });
    }

    // 3️⃣ Fetch users
    const users = await UserModel.find({
      _id: { $in: validIds },
    }).select("-password");

    // 4️⃣ Send response
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    next(error);
  }
};

export const getFriends = async (req, res, next) => {
  console.log(req.body);

  try {
    const { FriendsId } = req.body;
    console.log("getFriends", FriendsId);

    // 1️⃣ Validate input
    if (!FriendsId || !Array.isArray(FriendsId) || FriendsId.length === 0) {
      return res.status(400).json({
        error: "Please provide an array of user IDs",
      });
    }

    // 2️⃣ Convert string IDs to ObjectId instances
    const validIds = FriendsId.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    ).map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        error: "No valid user IDs provided",
      });
    }

    // 3️⃣ Fetch users
    const users = await UserModel.find({
      _id: { $in: validIds },
    }).select("-password");

    // 4️⃣ Send response
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    next(error);
  }
};
