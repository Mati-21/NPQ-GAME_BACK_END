import express from "express";
import { verifyToken } from "../Middleware/auth.middleware.js";
import {
  getAllUsers,
  getFriends,
  getOnlineUsers,
  getSomeUsers,
  searchUser,
} from "../controller/user.controller.js";

const router = express.Router();

router.route("/onlineusers").get(verifyToken, getOnlineUsers);
router.route("/searchuser").get(verifyToken, searchUser);
router.route("/getAllUsers").get(verifyToken, getAllUsers);
router.route("/getSomeUsers").post(verifyToken, getSomeUsers);
router.route("/getFriends").post(verifyToken, getFriends);

export default router;
