import express from "express";
import { verifyToken } from "../Middleware/auth.middleware.js";
import {
  getNotifications,
  markAllAsRead,
  markOneAsRead,
} from "../controller/notification.controller.js";

const router = express.Router();

router.get("/", verifyToken, getNotifications);
router.put("/mark-read", verifyToken, markAllAsRead);
router.put("/:id/read", verifyToken, markOneAsRead);

export default router;
