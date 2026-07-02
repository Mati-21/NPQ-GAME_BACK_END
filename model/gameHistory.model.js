import mongoose from "mongoose";

const gameHistorySchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
        required: true,
      },
    ],
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    loser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    reason: {
      type: String,
      enum: ["guess", "resign"],
      default: "guess",
    },
    pointsAwarded: {
      type: Number,
      default: 3,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.model("GameHistory", gameHistorySchema);
