import mongoose from "mongoose";
import UserModel from "./model/user.model.js";
import dotenv from "dotenv";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Connected to DB!");
  const users = await UserModel.find({});
  console.log(`Found ${users.length} users:`);
  users.forEach(u => {
    console.log(`- Username: ${u.username}, Points: ${u.stats?.points}`);
  });
  await mongoose.disconnect();
}

check().catch(console.error);
