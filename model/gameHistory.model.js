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
        ref: "User",
        required: true,
      },
    ],
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    loser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isDraw: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      enum: ["guess", "resign", "timeout", "draw"],
      default: "guess",
    },
    pointsAwarded: {
      type: Number,
      default: 3,
    },
    guesses: {
      type: Array,
      default: [],
    },
    responses: {
      type: Array,
      default: [],
    },
    chat: [
      {
        senderId: String,
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    hostSecretNumber: {
      type: String,
      default: "",
    },
    guestSecretNumber: {
      type: String,
      default: "",
    },
    autoCheck: {
      type: Boolean,
      default: false,
    },
    guessingTimer: {
      type: Number,
      default: 3,
    },
    responseTimer: {
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
