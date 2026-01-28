import createHttpError from "http-errors";
import validator from "validator";
import UserModel from "../model/user.model.js";
import bcrypt from "bcryptjs";

export const createUser = async (username, email, password, name) => {
  // 1. Required fields
  if (!username || !name || !email || !password) {
    throw createHttpError.BadRequest("Please fill all required fields");
  }

  // 2. Name validation
  if (!/^[a-zA-Z\s-]+$/.test(name)) {
    throw createHttpError.BadRequest(
      "Name should not contain special characters",
    );
  }

  if (!validator.isLength(name, { min: 2, max: 20 })) {
    throw createHttpError.BadRequest(
      "Name must be between 2 and 20 characters long",
    );
  }

  // 3. Email validation
  if (!validator.isEmail(email)) {
    throw createHttpError.BadRequest("Please provide a valid email address");
  }

  // 4. Password validation
  if (!validator.isLength(password, { min: 6 })) {
    throw createHttpError.BadRequest(
      "Password must be at least 6 characters long",
    );
  }

  // 5. Check if user exists
  const userExists = await UserModel.findOne({
    $or: [{ email }, { username }],
  });

  if (userExists) {
    throw createHttpError.Conflict(
      "User with this email or username already exists",
    );
  }

  // 6. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 7. Create user
  const user = await UserModel.create({
    username,
    name,
    email,
    passwordHash: hashedPassword,
  });

  return user;
};

export const signInUser = async (email, password) => {
  if (!email || !password) {
    throw createHttpError.BadRequest("Email and password are required");
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    // 👇 Security best practice
    throw createHttpError.Unauthorized("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw createHttpError.Unauthorized("Invalid email or password");
  }

  // remove password before returning
  const userObj = user.toObject();
  delete userObj.passwordHash;

  return userObj;
};
