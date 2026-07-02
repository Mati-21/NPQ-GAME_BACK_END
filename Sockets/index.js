import GameHistory from "../model/gameHistory.model.js";
import User from "../model/user.model.js";

const onlineUsers = new Map();
const activeGames = new Map();

/**
 * Game state structure:
 *  - hostId / guestId: the two players
 *  - currentTurn: whose turn it is right now
 *  - phase: "guess" | "response"
 *  - pendingGuessFor: who made the latest guess (the responder will answer FOR this player)
 *  - guesses: [{ playerId, guess }]
 *  - responses: [{ responderId, guess, place, qty, forPlayerId }]
 *  - guessingTimer / responseTimer: minutes configured by host
 */
const buildGameState = (hostId, guestId, guessingTimer, responseTimer) => ({
  hostId,
  guestId,
  startedAt: new Date(),
  status: "active",
  phase: "guess",
  currentTurn: hostId,       // Host ALWAYS guesses first
  pendingGuessFor: null,     // set when a guess is submitted
  guessingTimer: Number(guessingTimer) || 3,
  responseTimer: Number(responseTimer) || 3,
  guesses: [],
  responses: [],
  winner: null,
  loser: null,
  reason: null,
});

export const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);
    onlineUsers.set(socket.userId.toString(), socket.id);
    console.log("Online users:", onlineUsers);

    io.emit("online-users", Array.from(onlineUsers.keys()));
    socket.join(socket.userId.toString());

    console.log("👤 User joined room:", socket.userId);

    // ────────────────────────────────────────────────
    // Lobby events
    // ────────────────────────────────────────────────
    socket.on("send-game-request", ({ toUserId, fromUser }) => {
      io.to(toUserId.toString()).emit("game-request", {
        fromUser,
        requestId: `${socket.userId}-${toUserId}-${Date.now()}`,
      });
    });

    socket.on("accept-game-request", ({ toUserId, requestId, acceptedBy }) => {
      io.to(toUserId.toString()).emit("game-request-accepted", {
        byUser: acceptedBy,
        requestId,
      });
    });

    socket.on("decline-game-request", ({ toUserId, requestId }) => {
      io.to(toUserId.toString()).emit("game-request-declined", {
        byUserId: socket.userId,
        requestId,
      });
    });

    socket.on("player-ready", ({ toUserId }) => {
      io.to(toUserId.toString()).emit("opponent-ready");
    });

    socket.on("player-not-ready", ({ toUserId }) => {
      io.to(toUserId.toString()).emit("opponent-not-ready");
    });

    // ────────────────────────────────────────────────
    // Start game session (host only)
    // ────────────────────────────────────────────────
    socket.on(
      "start-game-session",
      ({ hostId, guestId, secretNumber, guessingTimer, responseTimer }) => {
        // Only the host socket may start the game
        if (String(socket.userId) !== String(hostId)) {
          socket.emit("start-game-error", {
            message: "Only the player who sent the game request can start as host.",
          });
          return;
        }

        if (String(hostId) === String(guestId)) {
          socket.emit("start-game-error", {
            message: "Host and guest cannot be the same user.",
          });
          return;
        }

        const sessionKey = [hostId, guestId].sort().join("-");

        if (activeGames.has(sessionKey)) {
          socket.emit("start-game-error", {
            message: "A game between these players is already active.",
          });
          return;
        }

        const game = buildGameState(hostId, guestId, guessingTimer, responseTimer);
        // Store the host's secret number so we can check when guest guesses
        game.hostSecretNumber = String(secretNumber || "").trim();
        activeGames.set(sessionKey, game);

        // Payload sent to BOTH players so they can sync timers and initial state
        const sharedPayload = {
          gameId: sessionKey,
          phase: game.phase,
          currentTurn: game.currentTurn,
          guesses: [],
          responses: [],
          latestResponse: null,
          guessingTimer: game.guessingTimer,
          responseTimer: game.responseTimer,
        };

        // Tell each player their role
        io.to(hostId.toString()).emit("game-session-started", {
          ...sharedPayload,
          opponentId: guestId,
          role: "host",
        });
        io.to(guestId.toString()).emit("game-session-started", {
          ...sharedPayload,
          opponentId: hostId,
          role: "guest",
        });
      }
    );

    // ────────────────────────────────────────────────
    // Submit guess  (the current guesser's turn)
    // ────────────────────────────────────────────────
    socket.on("submit-guess", ({ gameId, playerId, guess }) => {
      const game = activeGames.get(gameId);
      if (!game || game.status !== "active") return;

      // Must be guess phase AND this player's turn
      if (
        game.phase !== "guess" ||
        String(game.currentTurn) !== String(playerId)
      ) {
        return;
      }

      const normalizedGuess = String(guess).trim();

      // Check win: compare against the OPPONENT's secret number.
      // We only store host's secret; guest's secret must be stored when submitted.
      // Win detection: the guesser is trying to guess the OPPONENT's number.
      // We store each player's secret when they start the game.
      // For now, we detect win by checking the opponent's stored secret.
      const opponentId =
        String(playerId) === String(game.hostId) ? game.guestId : game.hostId;
      const opponentSecret =
        String(playerId) === String(game.hostId)
          ? game.guestSecretNumber
          : game.hostSecretNumber;

      const isWinner =
        opponentSecret && normalizedGuess === String(opponentSecret).trim();

      // Record the guess
      game.guesses.push({ playerId: String(playerId), guess: normalizedGuess });

      if (isWinner) {
        // ── Game over ──
        game.status = "finished";
        game.winner = String(playerId);
        game.loser = String(opponentId);
        game.reason = "guess";

        const resultPayload = {
          winnerId: game.winner,
          loserId: game.loser,
          reason: "guess",
          pointsAwarded: 3,
        };

        io.to(game.hostId.toString()).emit("game-result", resultPayload);
        io.to(game.guestId.toString()).emit("game-result", resultPayload);

        activeGames.delete(gameId);
        void persistGameResult(game);
        return;
      }

      // ── Not a winner: switch to response phase ──
      // The OTHER player (opponent) must respond to this guess
      game.pendingGuessFor = String(playerId); // who guessed
      game.phase = "response";
      game.currentTurn = String(opponentId);   // opponent must respond

      const turnPayload = {
        phase: game.phase,
        currentTurn: game.currentTurn,
        latestResponse: null,
        guess: normalizedGuess,
        guesserId: String(playerId),
        guesses: game.guesses,
        responses: game.responses,
        guessingTimer: game.guessingTimer,
        responseTimer: game.responseTimer,
      };

      io.to(game.hostId.toString()).emit("turn-updated", turnPayload);
      io.to(game.guestId.toString()).emit("turn-updated", turnPayload);
    });

    // ────────────────────────────────────────────────
    // Submit response (P & Q) — the responder's turn
    // ────────────────────────────────────────────────
    socket.on("submit-response", ({ gameId, playerId, place, qty }) => {
      const game = activeGames.get(gameId);
      if (!game || game.status !== "active") return;

      // Must be response phase AND this player's turn
      if (
        game.phase !== "response" ||
        String(game.currentTurn) !== String(playerId)
      ) {
        return;
      }

      // The guess that is being responded to
      const guessBeingAnswered = game.guesses[game.guesses.length - 1]?.guess || "";
      const originalGuesserId = game.pendingGuessFor; // who originally guessed

      const responseEntry = {
        responderId: String(playerId),
        guess: guessBeingAnswered,
        place: Number(place),
        qty: Number(qty),
        forPlayerId: originalGuesserId, // the guesser receives this response
      };

      game.responses.push(responseEntry);

      // ── After responding, the RESPONDER becomes the next GUESSER ──
      // Cycle: Host guesses → Guest responds → Guest guesses → Host responds → ...
      game.phase = "guess";
      game.currentTurn = String(playerId); // The responder now guesses
      game.pendingGuessFor = null;

      const turnPayload = {
        phase: game.phase,
        currentTurn: game.currentTurn,
        latestResponse: responseEntry,
        guesses: game.guesses,
        responses: game.responses,
        guessingTimer: game.guessingTimer,
        responseTimer: game.responseTimer,
      };

      io.to(game.hostId.toString()).emit("turn-updated", turnPayload);
      io.to(game.guestId.toString()).emit("turn-updated", turnPayload);
    });

    // ────────────────────────────────────────────────
    // Store guest secret number (emitted from GameSessionPage on load)
    // ────────────────────────────────────────────────
    socket.on("register-secret", ({ gameId, playerId, secretNumber }) => {
      const game = activeGames.get(gameId);
      if (!game) return;

      if (String(playerId) === String(game.hostId)) {
        game.hostSecretNumber = String(secretNumber).trim();
      } else if (String(playerId) === String(game.guestId)) {
        game.guestSecretNumber = String(secretNumber).trim();
      }
    });

    // ────────────────────────────────────────────────
    // Timer expired — forfeit that player's turn (or forfeit game)
    // ────────────────────────────────────────────────
    socket.on("timer-expired", ({ gameId, playerId }) => {
      const game = activeGames.get(gameId);
      if (!game || game.status !== "active") return;
      if (String(game.currentTurn) !== String(playerId)) return;

      // Treat timer expiry as a forfeit (loss)
      const opponentId =
        String(playerId) === String(game.hostId) ? game.guestId : game.hostId;

      game.status = "finished";
      game.winner = String(opponentId);
      game.loser = String(playerId);
      game.reason = "timeout";

      const resultPayload = {
        winnerId: game.winner,
        loserId: game.loser,
        reason: "timeout",
        pointsAwarded: 3,
      };

      io.to(game.hostId.toString()).emit("game-result", resultPayload);
      io.to(game.guestId.toString()).emit("game-result", resultPayload);

      activeGames.delete(gameId);
      void persistGameResult(game);
    });

    // ────────────────────────────────────────────────
    // Resign
    // ────────────────────────────────────────────────
    socket.on("resign-game", ({ gameId, playerId }, callback) => {
      try {
        const game = activeGames.get(gameId);
        if (!game || game.status === "finished") {
          if (typeof callback === "function")
            callback({ success: false, message: "Game is not active." });
          return;
        }

        const winnerId =
          String(playerId) === String(game.hostId) ? game.guestId : game.hostId;
        game.status = "finished";
        game.winner = String(winnerId);
        game.loser = String(playerId);
        game.reason = "resign";

        io.to(game.hostId.toString()).emit("game-result", {
          winnerId: game.winner,
          loserId: game.loser,
          reason: "resign",
          pointsAwarded: 3,
        });
        io.to(game.guestId.toString()).emit("game-result", {
          winnerId: game.winner,
          loserId: game.loser,
          reason: "resign",
          pointsAwarded: 3,
        });

        activeGames.delete(gameId);
        void persistGameResult(game);

        if (typeof callback === "function")
          callback({ success: true, message: "You resigned the game." });

        io.to(socket.userId.toString()).emit("resign-ack", {
          success: true,
          message: "You resigned the game.",
        });
      } catch (err) {
        console.error("Error handling resign-game", err);
        if (typeof callback === "function")
          callback({ success: false, message: "Failed to resign the game." });
      }
    });

    // ────────────────────────────────────────────────
    // Disconnect
    // ────────────────────────────────────────────────
    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId.toString());
      io.emit("online-users", Array.from(onlineUsers.keys()));
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
};

const persistGameResult = async (game) => {
  try {
    const gameId = `game-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await GameHistory.create({
      gameId,
      players: [game.hostId, game.guestId],
      winner: game.winner,
      loser: game.loser,
      reason: game.reason,
      pointsAwarded: 3,
      startedAt: game.startedAt,
      endedAt: new Date(),
    });

    await User.findByIdAndUpdate(game.winner, {
      $inc: { "stats.points": 3, "stats.wins": 1, "stats.totalGames": 1 },
    });

    await User.findByIdAndUpdate(game.loser, {
      $inc: { "stats.losses": 1, "stats.totalGames": 1 },
    });
  } catch (error) {
    console.error("Failed to persist game result", error);
  }
};
