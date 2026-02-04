import mongoose from "mongoose";
import app from "./app.js";
import { createServer } from "http";

import dotenv from "dotenv";
import { Server } from "socket.io";
import { socketHandler } from "./Socket/handlers/index.js";

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
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // your frontend origin
    credentials: true, // important for cookies
  },
});

// 🔑 ATTACH IO HERE
app.set("io", io);

// Attach socket logic
socketHandler(io);

// ---------------------------
// Start server
// ---------------------------
httpServer.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
