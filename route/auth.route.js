import express from "express";
import {
  checkAuth,
  login,
  logout,
  Register,
} from "../controller/auth.controller.js";
import { verifyToken } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/register").post(Register);
router.route("/checkAuth").get(verifyToken, checkAuth);

export default router;
