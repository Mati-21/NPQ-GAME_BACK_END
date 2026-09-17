import { Server } from "socket.io";
import { socketAuthMiddleware } from "../Sockets/socketAuth.js";
import { registerSocketHandlers } from "../Sockets/index.js";

export const initSocket = (server, app) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://npq-game-front-end.vercel.app",
    "https://npq-game-front-end-git-main-mati-21s-projects.vercel.app",
  ];

  if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
    allowedOrigins.push(process.env.CLIENT_URL);
  }

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          /\.vercel\.app$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(new Error("CORS origin not allowed for socket"));
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // 🔥 attach to express
  app.set("io", io);

  // 🔐 Register auth middleware
  io.use(socketAuthMiddleware);

  // 📡 Register handlers
  registerSocketHandlers(io);

  return io;
};
