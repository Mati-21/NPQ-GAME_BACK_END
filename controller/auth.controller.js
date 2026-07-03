import UserModel from "../model/user.model.js";
import { createUser, signInUser } from "../service/auth.service.js";
import { createToken } from "../service/token.service.js";

export const Register = async (req, res, next) => {
  const { username, email, password, firstName, lastName } = req.body;
  const user = await createUser(username, email, password, firstName, lastName);

  const token = await createToken(
    { userId: user._id },
    process.env.TokenSecret,
    {
      expiresIn: "1h", // or '60s', or 60
    },
  );

  res.cookie("Access_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60,
  });

  res.status(201).json({ user });
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await signInUser(email, password);

    const token = await createToken(
      { userId: user._id },
      process.env.TokenSecret,
      { expiresIn: "1h" },
    );

    res.cookie("Access_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60,
    });

    console.log("Hallo");
    res.status(200).json({ user });
  } catch (error) {
    next(error); // 🔥 THIS IS THE KEY
  }
};

export const logout = (req, res) => {
  console.log("logout");
  res.clearCookie("Access_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.status(200).json({ message: "Logged out successfully" });
};

export const checkAuth = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
