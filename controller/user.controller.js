import UserModel from "../model/user.model.js";

import bcrypt from "bcryptjs";
import streamifier from "streamifier";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";

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
  try {
    const { query } = req.query;
    console.log(query);

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // 1️⃣ Search users from DB (NO online filter)
    const users = await UserModel.find({
      $or: [{ username: { $regex: query, $options: "i" } }],
    }).select("-password");

    // 2️⃣ Get online user IDs from socket memory
    // const onlineUserIds = Array.from(onlineUsers.keys());

    // // 3️⃣ Attach online status to each user
    // const usersWithStatus = users.map((user) => ({
    //   ...user.toObject(),
    //   isOnline: onlineUserIds.includes(user._id.toString()),
    // }));

    res.status(200).json({
      users
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

// Upload image buffer to Cloudinary
const uploadToCloudinary = async (buffer, folder) => {
  console.log("Buffer length inside upload function:", buffer.length); // debug

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await UserModel.findById(req.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      firstName,
      lastName,
      email,
      birthDate,
      bio,
      aboutMe,
      country,
      region,
      currentPassword,
      newPassword,
    } = req.body;

    // --- Update password if provided ---
    if (currentPassword && newPassword) {
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match)
        return res.status(400).json({ message: "Incorrect current password" });

      user.passwordHash = await bcrypt.hash(
        newPassword,
        await bcrypt.genSalt(10),
      );
    }
    console.log(req.file);

    // --- Upload avatar if file exists ---
    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        `users/${user._id}/profile_pics`,
      );
      user.avatar = result.secure_url;
    }

    // --- Update basic fields ---
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (birthDate) user.birthDate = birthDate;
    if (bio) user.bio = bio;
    if (aboutMe) user.aboutMe = aboutMe;
    if (country) user.location.country = country;
    if (region) user.location.region = region;

    console.log("Last Step");

    // Save and return
    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
