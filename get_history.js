import mongoose from "mongoose";
import GameHistory from "./model/GameHistory.model.js";
import dotenv from "dotenv";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.DATABASE_URL);
  const histories = await GameHistory.find({ "guesses.guess": "3265" });
  console.log(`Found ${histories.length} matching games:`);
  histories.forEach((h, idx) => {
    console.log(`\n--- Game ${idx + 1} (${h.gameId}) ---`);
    console.log(`Winner: ${h.winner}, Loser: ${h.loser}, Reason: ${h.reason}, Draw: ${h.isDraw}`);
    console.log(`Guesses:`, JSON.stringify(h.guesses, null, 2));
    console.log(`Responses:`, JSON.stringify(h.responses, null, 2));
  });
  await mongoose.disconnect();
}

check().catch(console.error);
