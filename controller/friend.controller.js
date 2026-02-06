import UserModel from "../model/user.model.js";
import { onlineUsers } from "../Socket/handlers/index.js";

export const sendFriendRequest = async (req, res, next) => {
  console.log("Hello venessa");
  try {
    const senderId = req.userId;
    const receiverId = req.params.userId;

    console.log("sender", senderId);
    console.log("reciever", receiverId);

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

    // 🔔 notify receiver
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friend-request", {
        from: senderId,
        type: "FRIEND_REQUEST",
      });
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

    // 5️⃣ Notify receiver via socket (optional)
    // const receiverSocketId = onlineUsers.get(receiverId);
    // if (receiverSocketId && io) {
    //   io.to(receiverSocketId).emit("friend-request", {
    //     from: senderId,
    //     type: "FRIEND_REQUEST_ACCEPTED",
    //   });
    // }

    res.json({ message: "Friend request accepted successfully" });
  } catch (error) {
    next(error);
  }
};

export const Unfriend = async (req, res) => {
  console.log("check check");
  const userId = req.userId; // authenticated user
  const friendId = req.params.friendId;

  try {
    // Remove friend from authenticated user
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { friends: friendId },
    });

    // Remove authenticated user from friend's list
    await UserModel.findByIdAndUpdate(friendId, {
      $pull: { friends: userId },
    });

    res.status(200).json({ message: "Unfriended successfully", friendId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
