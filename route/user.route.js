import express from "express";
import { verifyToken } from "../Middleware/auth.middleware.js";
import { getOnlineUsers } from "../controller/user.controller.js";

const router = express.Router();

router.route("/onlineusers").get(verifyToken, getOnlineUsers);

export default router;
