import { Server } from "socket.io";
import { socketAuthMiddleware } from "../Sockets/socketAuth.js";
import { registerSocketHandlers } from "../Sockets/index.js";

export const initSocket = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "https://npq-game-front-end.vercel.app", "https://npq-game-front-end-git-main-mati-21s-projects.vercel.app"],
      credentials: true,
    },
    transports: ["websocket"],
  });

  // 🔥 attach to express
  app.set("io", io);

  // 🔐 Register auth middleware
  io.use(socketAuthMiddleware);

  // 📡 Register handlers
  registerSocketHandlers(io);

  return io;
};
