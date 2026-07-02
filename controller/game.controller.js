import GameHistory from "../model/gameHistory.model.js";
import User from "../model/user.model.js";

export const saveGameResult = async (req, res, next) => {
  try {
    const { players, winner, loser, reason, pointsAwarded = 3 } = req.body;

    if (!players || players.length !== 2 || !winner || !loser) {
      return res.status(400).json({ message: "Invalid game result payload" });
    }

    const gameId = `game-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const history = await GameHistory.create({
      gameId,
      players,
      winner,
      loser,
      reason: reason || "guess",
      pointsAwarded,
      startedAt: new Date(),
      endedAt: new Date(),
    });

    await User.findByIdAndUpdate(winner, {
      $inc: {
        "stats.points": pointsAwarded,
        "stats.wins": 1,
        "stats.totalGames": 1,
      },
    });

    await User.findByIdAndUpdate(loser, {
      $inc: { "stats.losses": 1, "stats.totalGames": 1 },
    });

    res.status(201).json({ message: "Game history saved", game: history });
  } catch (error) {
    next(error);
  }
};

export const getGameHistory = async (req, res, next) => {
  try {
    const history = await GameHistory.find({ players: req.userId })
      .populate("players", "username firstName lastName avatar")
      .populate("winner", "username firstName lastName avatar")
      .populate("loser", "username firstName lastName avatar")
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    next(error);
  }
};
