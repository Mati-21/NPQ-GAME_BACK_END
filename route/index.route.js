import express from "express";
import auth from "./auth.route.js";

const app = express();

app.use("/auth", auth);

export default router;
