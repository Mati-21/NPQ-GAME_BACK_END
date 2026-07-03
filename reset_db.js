import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function resetDatabase() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Connected to database");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log("ℹ️  No collections found — database is already empty.");
    } else {
      for (const col of collections) {
        await db.dropCollection(col.name);
        console.log(`🗑️  Dropped collection: ${col.name}`);
      }
      console.log(`\n✅ Done! Wiped ${collections.length} collection(s).`);
    }

    console.log("🚀 App is now fresh — all data has been cleared.");
  } catch (err) {
    console.error("❌ Error resetting database:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database.");
  }
}

resetDatabase();
