import mongoose from "mongoose";
import app from "./app.js";
import { createServer } from "http";

import dotenv from "dotenv";
import { initSocket } from "./config/socket.js";

dotenv.config(); // load .env

const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;

// ---------------------------
// Connect to MongoDB
// ---------------------------
mongoose
  .connect(DATABASE_URL)
  .then(() => console.log("Database connected successfully!!"))
  .catch((err) => console.log("DB connection error:", err));

mongoose.connection.on("error", (err) => console.log("DB error:", err));

// ---------------------------
// Start HTTP & Socket.IO server
// ---------------------------
const server = createServer(app);

// 🔥 Initialize socket
initSocket(server, app);

// ---------------------------
// Start server
// ---------------------------
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
