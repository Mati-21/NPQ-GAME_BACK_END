import createHttpError from "http-errors";
import validator from "validator";
import UserModel from "../model/user.model.js";
import bcrypt from "bcryptjs";

export const createUser = async (username, email, password, firstName, lastName) => {
  // 1. Required fields
  if (!username || !firstName || !lastName || !email || !password) {
    throw createHttpError.BadRequest("Please fill all required fields");
  }

  // 2. Name validation
  const nameRegex = /^[a-zA-Z\s-]+$/;
  if (!nameRegex.test(firstName)) {
    throw createHttpError.BadRequest("First name should not contain special characters");
  }
  if (!nameRegex.test(lastName)) {
    throw createHttpError.BadRequest("Last name should not contain special characters");
  }

  if (!validator.isLength(firstName, { min: 2, max: 50 })) {
    throw createHttpError.BadRequest("First name must be between 2 and 50 characters long");
  }
  if (!validator.isLength(lastName, { min: 2, max: 50 })) {
    throw createHttpError.BadRequest("Last name must be between 2 and 50 characters long");
  }

  // 3. Email validation
  if (!validator.isEmail(email)) {
    throw createHttpError.BadRequest("Please provide a valid email address");
  }

  // 4. Password validation
  if (!validator.isLength(password, { min: 6 })) {
    throw createHttpError.BadRequest("Password must be at least 6 characters long");
  }

  // 5. Check if user exists
  const userExists = await UserModel.findOne({
    $or: [{ email }, { username }],
  });

  if (userExists) {
    throw createHttpError.Conflict("User with this email or username already exists");
  }

  // 6. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 7. Create user
  const user = await UserModel.create({
    username,
    firstName,
    lastName,
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
