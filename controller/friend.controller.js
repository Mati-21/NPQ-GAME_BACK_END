import UserModel from "../model/user.model.js";
import NotificationModel from "../model/notification.model.js";

export const sendFriendRequest = async (req, res, next) => {
  try {
    const senderId = req.userId;
    const receiverId = req.params.userId;
    const io = req.app.get("io");

    // check if the user is not sending the request to is self
    if (senderId === receiverId) {
      return res.status(400).json({ message: "You can't add yourself" });
    }

    const sender = await UserModel.findById(senderId);
    const receiver = await UserModel.findById(receiverId);

    // already friends?
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: "Already friends" });
    }

    // already sent?
    if (sender.friendRequests.sent.includes(receiverId)) {
      return res.status(400).json({ message: "Request already sent" });
    }

    // already sent?
    if (sender.friendRequests.received.includes(receiverId)) {
      return res
        .status(400)
        .json({ message: "Request already sent to you by this user" });
    }

    sender.friendRequests.sent.push(receiverId);
    receiver.friendRequests.received.push(senderId);

    await sender.save();
    await receiver.save();

    // Create and save a notification in the database
    let populatedNotification = null;
    try {
      const notification = await NotificationModel.create({
        recipient: receiverId,
        sender: senderId,
        type: "friend_request",
      });
      populatedNotification = await notification.populate("sender", "username avatar firstName lastName");
    } catch (err) {
      console.error("Error creating friend request notification:", err);
    }

    io.to(receiverId).emit("friend-request", { senderId });
    if (populatedNotification) {
      io.to(receiverId).emit("new-notification", populatedNotification);
    }

    res.json({ message: "Friend request sent" });
  } catch (error) {
    next(error);
  }
};

export const acceptFriendRequest = async (req, res, next) => {
  try {
    const receiverId = req.userId; // the one accepting
    const senderId = req.params.userId;
    const io = req.app.get("io");

    // 1️⃣ Fetch both users
    const sender = await UserModel.findById(senderId);
    const receiver = await UserModel.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Remove from friend requests safely
    receiver.friendRequests.received.pull(senderId);
    sender.friendRequests.sent.pull(receiverId);

    // 3️⃣ Add both to friends list if not already friends
    if (!receiver.friends.includes(senderId)) receiver.friends.push(senderId);
    if (!sender.friends.includes(receiverId)) sender.friends.push(receiverId);

    // 4️⃣ Save changes
    await receiver.save();
    await sender.save();

    // Create and save a notification in the database
    let populatedNotification = null;
    try {
      const notification = await NotificationModel.create({
        recipient: senderId,
        sender: receiverId,
        type: "friend_accept",
      });
      populatedNotification = await notification.populate("sender", "username avatar firstName lastName");
    } catch (err) {
      console.error("Error creating friend accept notification:", err);
    }

    // 5️⃣ Notify receiver via socket (optional)
    io.to(senderId).emit("new-friend", { receiverId });
    if (populatedNotification) {
      io.to(senderId).emit("new-notification", populatedNotification);
    }

    res.json({ message: "Friend request accepted successfully" });
  } catch (error) {
    next(error);
  }
};

export const Unfriend = async (req, res) => {
  const userId = req.userId; // authenticated user
  const friendId = req.params.friendId;
  const io = req.app.get("io");

  try {
    // Remove friend from authenticated user
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { friends: friendId },
    });

    // Remove authenticated user from friend's list
    await UserModel.findByIdAndUpdate(friendId, {
      $pull: { friends: userId },
    });

    io.to(friendId).emit("unfriend", { userId });

    res.status(200).json({ message: "Unfriended successfully", friendId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const cancelFriendRequest = async (req, res, next) => {
  try {
    const senderId = req.userId;
    const receiverId = req.params.userId;

    await UserModel.findByIdAndUpdate(senderId, {
      $pull: { "friendRequests.sent": receiverId },
    });
    await UserModel.findByIdAndUpdate(receiverId, {
      $pull: { "friendRequests.received": senderId },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(receiverId).emit("cancel-friend-request", { senderId });
    }

    res.json({ message: "Friend request cancelled" });
  } catch (error) {
    next(error);
  }
};

export const rejectFriendRequest = async (req, res, next) => {
  try {
    const receiverId = req.userId;
    const senderId = req.params.userId;
    const io = req.app.get("io");

    const sender = await UserModel.findById(senderId);
    const receiver = await UserModel.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    receiver.friendRequests.received.pull(senderId);
    sender.friendRequests.sent.pull(receiverId);

    await receiver.save();
    await sender.save();

    if (io) {
      io.to(senderId).emit("reject-friend-request", { receiverId });
    }

    res.json({ message: "Friend request rejected" });
  } catch (error) {
    next(error);
  }
};


