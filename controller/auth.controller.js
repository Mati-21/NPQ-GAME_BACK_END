import { createUser, signInUser } from "../service/auth.service.js";
import { createToken } from "../service/token.service.js";

export const Register = async (req, res, next) => {
  const { username, email, password, name } = req.body;
  const user = await createUser(username, email, password, name);

  const token = await createToken(
    { userId: user._id },
    process.env.TokenSecret,
    {
      expiresIn: "1h", // or '60s', or 60
    },
  );

  res.cookie("Access_token", token, {
    httpOnly: true,
    sameSite: "strict",
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
      sameSite: "strict",
      maxAge: 1000 * 60 * 60,
    });

    res.status(200).json({ user });
  } catch (error) {
    next(error); // 🔥 THIS IS THE KEY
  }
};

export const logout = (req, res) => {
  res.clearCookie("Access_token", {
    httpOnly: true,
    sameSite: "strict",
  });

  res.status(200).json({ message: "Logged out successfully" });
};

export const verifyUser = async (req, res, next) => {
  res.status(200).json({ verifyUser: "True" });
};
