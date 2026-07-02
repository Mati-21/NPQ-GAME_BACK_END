import express from "express";
import auth from "./auth.route.js";
import user from "./user.route.js";
import friends from "./friend.route.js";
import game from "./game.route.js";

const router = express.Router();

router.use("/auth", auth);
router.use("/user", user);
router.use("/friends", friends);
router.use("/game", game);

export default router;
