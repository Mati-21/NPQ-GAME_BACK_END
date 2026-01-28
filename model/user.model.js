import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    index: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: "",
  },

  // Online presence tracking
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  socketId: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["online", "away", "busy", "offline"],
    default: "offline",
  },

  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  // Friend requests system
  friendRequests: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
      sentAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  stats: {
    totalGames: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },
  },

  // Game preferences
  preferences: {
    theme: {
      type: String,
      enum: ["light", "dark", "auto"],
      default: "auto",
    },
    notifications: {
      type: Boolean,
      default: true,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to get public profile (without sensitive data)
UserSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    status: this.status,
    stats: this.stats,
    preferences: this.preferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Method to update online status
UserSchema.methods.updateOnlineStatus = async function (
  isOnline,
  socketId = "",
) {
  this.isOnline = isOnline;
  this.lastSeen = new Date();
  this.socketId = socketId;
  this.status = isOnline ? "online" : "offline";
  return await this.save();
};

// Static method to find online users
UserSchema.statics.findOnlineUsers = function () {
  return this.find({ isOnline: true })
    .select("_id username avatar status lastSeen socketId")
    .lean();
};

// Static method to find by socketId
UserSchema.statics.findBySocketId = function (socketId) {
  return this.findOne({ socketId }).select("_id username");
};

const UserModel = mongoose.model("User", UserSchema);
export default UserModel;
