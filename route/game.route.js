import express from "express";
import { verifyToken } from "../Middleware/auth.middleware.js";
import {
  saveGameResult,
  getGameHistory,
} from "../controller/game.controller.js";

const router = express.Router();

router.post("/result", verifyToken, saveGameResult);
router.get("/history", verifyToken, getGameHistory);

export default router;
