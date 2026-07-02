import express from "express";
import {
  acceptFriendRequest,
  sendFriendRequest,
  Unfriend,
  cancelFriendRequest,
  rejectFriendRequest,
} from "../controller/friend.controller.js";
import { verifyToken } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.post("/request/:userId", verifyToken, sendFriendRequest);
router.put("/accept/:userId", verifyToken, acceptFriendRequest);
router.delete("/unfriend/:friendId", verifyToken, Unfriend);
router.delete("/cancel/:userId", verifyToken, cancelFriendRequest);
router.delete("/reject/:userId", verifyToken, rejectFriendRequest);


export default router;

