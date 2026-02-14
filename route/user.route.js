import express from "express";
import { verifyToken } from "../Middleware/auth.middleware.js";
import {
  getAllUsers,
  getFriends,
  getOnlineUsers,
  getSomeUsers,
  searchUser,
  updateProfile,
} from "../controller/user.controller.js";
import upload from "../Middleware/upload.middleware.js";

const router = express.Router();

router.route("/onlineusers").get(verifyToken, getOnlineUsers);
router.route("/searchuser").get(verifyToken, searchUser);
router.route("/getAllUsers").get(verifyToken, getAllUsers);
router.route("/getSomeUsers").post(verifyToken, getSomeUsers);
router.route("/getFriends").post(verifyToken, getFriends);
router
  .route("/updateProfile")
  .patch(verifyToken, upload.single("avatar"), updateProfile);

export default router;
