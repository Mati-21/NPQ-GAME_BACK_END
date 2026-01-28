import jwt from "jsonwebtoken";
import cookie from "cookie";

export const onlineUsers = new Map();

export const socketHandler = (io) => {
  // 🔐 AUTH MIDDLEWARE
  io.use((socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) return next(new Error("No cookies"));

      const parsedCookies = cookie.parse(cookies);

      // ✅ FIX: correct cookie name
      const token = parsedCookies.Access_token;

      if (!token) return next(new Error("Access token missing"));

      const decoded = jwt.verify(token, process.env.TokenSecret);

      socket.userId = decoded.userId;
      next();
    } catch (err) {
      console.log("Socket auth error:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  // 🔌 CONNECTION
  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.userId);

    onlineUsers.set(socket.userId, socket.id);
    io.emit("online-users", [...onlineUsers.keys()]);

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId);
      io.emit("online-users", [...onlineUsers.keys()]);
      console.log("❌ Socket disconnected:", socket.userId);
    });
  });
};
