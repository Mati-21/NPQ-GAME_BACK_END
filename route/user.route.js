import express from "express";
import { verifyToken } from "../Middleware/auth.middleware.js";
import { getOnlineUsers, searchUser } from "../controller/user.controller.js";

const router = express.Router();

router.route("/onlineusers").get(verifyToken, getOnlineUsers);
router.route("/searchuser").get(verifyToken, searchUser);

export default router;
