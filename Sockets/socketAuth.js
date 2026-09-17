import cookie from "cookie";
import jwt from "jsonwebtoken";

export const socketAuthMiddleware = (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token =
      cookies.Access_token ||
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, process.env.TokenSecret);

    socket.userId = decoded.userId; // 🔥 attach to socket

    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
};