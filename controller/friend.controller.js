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

    const sender = await UserModel.findById(senderId);
    const receiver = await UserModel.findById(receiverId);

    // remove from requests
    receiver.friendRequests.received = receiver.friendRequests.received.filter(
      (id) => id.toString() !== senderId,
    );

    sender.friendRequests.sent = sender.friendRequests.sent.filter(
      (id) => id.toString() !== receiverId,
    );

    // add both to friends list
    receiver.friends.push(senderId);
    sender.friends.push(receiverId);

    sender.friendRequests.sent.push(receiverId);
    receiver.friendRequests.received.push(senderId);

    await receiver.save();
    await sender.save();

    // 🔔 notify receiver
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friend-request", {
        from: senderId,
        type: "FRIEND_REQUEST",
      });
    }

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    next(error);
  }
};
