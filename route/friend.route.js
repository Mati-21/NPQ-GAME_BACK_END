import express from "express";
import {
  acceptFriendRequest,
  sendFriendRequest,
} from "../controller/friend.controller.js";
import { verifyToken } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.post("/request/:userId", verifyToken, sendFriendRequest);
router.post("/accept/:userId", verifyToken, acceptFriendRequest);

export default router;
