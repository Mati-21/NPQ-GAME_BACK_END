import mongoose from "mongoose";

const FriendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  },
);

// Prevent duplicate pending requests
FriendRequestSchema.index(
  { from: 1, to: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

export default mongoose.model("FriendRequest", FriendRequestSchema);
