import express from "express";
import { sendFriendRequest } from "../controller/friend.controller.js";
import { verifyToken } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.post("/request/:userId", verifyToken, sendFriendRequest);

export default router;
