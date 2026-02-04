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
