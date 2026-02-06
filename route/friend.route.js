import express from "express";
import {
  acceptFriendRequest,
  sendFriendRequest,
  Unfriend,
} from "../controller/friend.controller.js";
import { verifyToken } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.post("/request/:userId", verifyToken, sendFriendRequest);
router.put("/accept/:userId", verifyToken, acceptFriendRequest);
router.delete("/unfriend/:friendId", verifyToken, Unfriend);

export default router;
