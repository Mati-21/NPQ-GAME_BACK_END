import mongoose from "mongoose";
import UserModel from "./model/user.model.js";
import dotenv from "dotenv";

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Connected to DB!");
  
  await UserModel.updateOne({ username: "Mati-21" }, { "stats.points": 15 });
  await UserModel.updateOne({ username: "Amir-28" }, { "stats.points": 40 });
  await UserModel.updateOne({ username: "Urji-45" }, { "stats.points": 5 });
  await UserModel.updateOne({ username: "Kefe-21" }, { "stats.points": 50 });
  await UserModel.updateOne({ username: "Mati-211" }, { "stats.points": 0 });

  console.log("Seeding points completed!");
  await mongoose.disconnect();
}

seed().catch(console.error);
