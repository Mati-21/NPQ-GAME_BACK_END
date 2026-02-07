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

  // Personal Information (NEW)
  firstName: {
    type: String,
    trim: true,
    default: "",
    maxlength: 50,
  },
  lastName: {
    type: String,
    trim: true,
    default: "",
    maxlength: 50,
  },
  bio: {
    type: String,
    trim: true,
    default: "",
    maxlength: 160, // Twitter-like bio length
  },
  aboutMe: {
    type: String,
    trim: true,
    default: "",
    maxlength: 1000, // Longer description
  },
  birthDate: {
    type: Date,
    default: null,
  },
  location: {
    country: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    region: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    city: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
  },

  // Contact Information (NEW)
  socialLinks: {
    website: {
      type: String,
      trim: true,
      default: "",
      match: [/^https?:\/\/.+/, "Please enter a valid URL"],
    },
    twitter: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },
    github: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },
    linkedin: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
  },

  // Privacy Settings (NEW)
  privacy: {
    profileVisibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    showOnlineStatus: {
      type: Boolean,
      default: true,
    },
    showLastSeen: {
      type: Boolean,
      default: true,
    },
    showStats: {
      type: Boolean,
      default: true,
    },
  },

  // Account Verification (NEW)
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    default: "",
  },
  emailVerified: {
    type: Boolean,
    default: false,
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
      ref: "UserModel",
    },
  ],

  friendRequests: {
    sent: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserModel" }],
    received: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserModel" }],
  },

  stats: {
    totalGames: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },
    // Additional stats (NEW)
    rating: { type: Number, default: 1000 },
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    achievements: [{ type: String }],
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
    // Additional preferences (NEW)
    language: {
      type: String,
      default: "en",
      maxlength: 5,
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },
    chatEnabled: {
      type: Boolean,
      default: true,
    },
    gameDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
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

  // Account Activity Tracking (NEW)
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  loginCount: {
    type: Number,
    default: 0,
  },
});

// Update timestamp on save
UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Calculate level based on experience (optional)
  if (this.stats.experience >= 1000) {
    this.stats.level = Math.floor(this.stats.experience / 1000) + 1;
  }

  next();
});

// Method to get public profile (without sensitive data)
UserSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    aboutMe: this.aboutMe,
    birthDate: this.birthDate,
    location: this.location,
    socialLinks: this.socialLinks,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    status: this.status,
    stats: this.stats,
    preferences: this.preferences,
    privacy: this.privacy,
    isVerified: this.isVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    // Don't include sensitive data like email if privacy settings restrict it
  };
};

// Method to get full profile (for user's own view)
UserSchema.methods.getFullProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    bio: this.bio,
    aboutMe: this.aboutMe,
    birthDate: this.birthDate,
    location: this.location,
    socialLinks: this.socialLinks,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    status: this.status,
    stats: this.stats,
    preferences: this.preferences,
    privacy: this.privacy,
    isVerified: this.isVerified,
    emailVerified: this.emailVerified,
    friends: this.friends,
    friendRequests: this.friendRequests,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLogin: this.lastLogin,
    loginCount: this.loginCount,
  };
};

// Method to update profile
UserSchema.methods.updateProfile = async function (updateData) {
  const allowedFields = [
    "firstName",
    "lastName",
    "bio",
    "aboutMe",
    "birthDate",
    "avatar",
    "location",
    "socialLinks",
    "preferences",
    "privacy",
  ];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (field === "location" && typeof updateData.location === "object") {
        this.location = { ...this.location, ...updateData.location };
      } else if (
        field === "socialLinks" &&
        typeof updateData.socialLinks === "object"
      ) {
        this.socialLinks = { ...this.socialLinks, ...updateData.socialLinks };
      } else if (
        field === "preferences" &&
        typeof updateData.preferences === "object"
      ) {
        this.preferences = { ...this.preferences, ...updateData.preferences };
      } else if (
        field === "privacy" &&
        typeof updateData.privacy === "object"
      ) {
        this.privacy = { ...this.privacy, ...updateData.privacy };
      } else {
        this[field] = updateData[field];
      }
    }
  });

  return await this.save();
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

  if (isOnline) {
    this.loginCount += 1;
    this.lastLogin = new Date();
  }

  return await this.save();
};

// Static method to find online users
UserSchema.statics.findOnlineUsers = function () {
  return this.find({ isOnline: true })
    .select(
      "_id username firstName lastName avatar status lastSeen socketId stats.level",
    )
    .lean();
};

// Static method to find by socketId
UserSchema.statics.findBySocketId = function (socketId) {
  return this.findOne({ socketId }).select("_id username");
};

// Static method to update user stats
UserSchema.statics.updateStats = async function (userId, statsUpdate) {
  const allowedStats = [
    "totalGames",
    "wins",
    "losses",
    "winStreak",
    "bestWinStreak",
    "experience",
    "rating",
  ];

  return await this.findByIdAndUpdate(
    userId,
    {
      $inc: Object.keys(statsUpdate).reduce((acc, key) => {
        if (allowedStats.includes(key)) {
          acc[`stats.${key}`] = statsUpdate[key];
        }
        return acc;
      }, {}),
    },
    { new: true },
  );
};

const UserModel = mongoose.model("User", UserSchema);
export default UserModel;
