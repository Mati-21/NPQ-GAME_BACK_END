import { checkToken } from "../service/token.service.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.Access_token;
    console.log("toke")

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = await checkToken(token, process.env.TokenSecret);
    console.log(decoded.userId)

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
