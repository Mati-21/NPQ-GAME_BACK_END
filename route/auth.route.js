import express from "express";
import {
  login,
  logout,
  Register,
  verifyUser,
} from "../controller/auth.controller.js";

const router = express.Router();

router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/register").post(Register);
router.route("/verifyUser").post(verifyUser);

export default router;
