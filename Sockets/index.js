import GameHistory from "../model/gameHistory.model.js";
import User from "../model/user.model.js";
import NotificationModel from "../model/notification.model.js";

const onlineUsers = new Map();
const activeGames = new Map();
// lobbyStates tracks which players have locked in their number before their opponent joins
// key: sorted "userId1-userId2", value: Set of userIds who are ready
const lobbyStates = new Map();

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
const buildGameState = (
  hostId,
  guestId,
  guessingTimer,
  responseTimer,
  autoCheck,
) => ({
  hostId,
  guestId,
  startedAt: new Date(),
  status: "active",
  phase: "guess",
  currentTurn: hostId, // Host ALWAYS guesses first
  currentRound: 1,
  pendingGuessFor: null, // set when a guess is submitted
  guessingTimer: Number(guessingTimer) || 3,
  responseTimer: Number(responseTimer) || 3,
  autoCheck: Boolean(autoCheck),
  guesses: [],
  responses: [],
  winner: null,
  loser: null,
  reason: null,
  isDraw: false,
  chat: [],
});

const clearServerTimer = (game) => {
  if (game && game.timerId) {
    clearTimeout(game.timerId);
    game.timerId = null;
  }
};

const getRoundGuessForPlayer = (game, playerId, round = game.currentRound) =>
  game.guesses.find(
    (g) =>
      String(g.playerId) === String(playerId) &&
      Number(g.round || 1) === Number(round),
  );

const getCurrentRoundCorrectness = (game) => {
  const hostGuess = getRoundGuessForPlayer(game, game.hostId);
  const guestGuess = getRoundGuessForPlayer(game, game.guestId);

  return {
    hostGuess,
    guestGuess,
    isRoundComplete: Boolean(hostGuess && guestGuess),
    hostCorrect:
      Boolean(hostGuess) &&
      String(hostGuess.guess).trim() ===
        String(game.guestSecretNumber || "").trim(),
    guestCorrect:
      Boolean(guestGuess) &&
      String(guestGuess.guess).trim() ===
        String(game.hostSecretNumber || "").trim(),
  };
};

const checkRoundEnd = (io, game, gameId) => {
  const { hostCorrect, guestCorrect, isRoundComplete } =
    getCurrentRoundCorrectness(game);

  // Only end the game when both players have guessed in the same round.
  if (isRoundComplete) {
    if (hostCorrect || guestCorrect) {
      clearServerTimer(game);
      game.status = "finished";

      let resultPayload;
      if (hostCorrect && guestCorrect) {
        game.isDraw = true;
        game.reason = "draw";
        resultPayload = {
          winnerId: null,
          loserId: null,
          isDraw: true,
          reason: "draw",
          pointsAwarded: 0,
        };
      } else if (hostCorrect) {
        game.winner = String(game.hostId);
        game.loser = String(game.guestId);
        game.reason = "guess";
        resultPayload = {
          winnerId: game.winner,
          loserId: game.loser,
          reason: "guess",
          pointsAwarded: 3,
        };
      } else {
        game.winner = String(game.guestId);
        game.loser = String(game.hostId);
        game.reason = "guess";
        resultPayload = {
          winnerId: game.winner,
          loserId: game.loser,
          reason: "guess",
          pointsAwarded: 3,
        };
      }

      // Include guesses and responses count in the result
      resultPayload.totalGuesses = game.guesses.length;
      resultPayload.totalResponses = game.responses.length;
      resultPayload.guesses = game.guesses;
      resultPayload.responses = game.responses;
      resultPayload.currentRound = game.currentRound;

      console.log("\n========== [SERVER] GAME ENDED ==========");
      console.log("GameId:", gameId);
      console.log("Winner:", resultPayload.winnerId, "| Loser:", resultPayload.loserId, "| Draw:", resultPayload.isDraw);
      console.log("Total Guesses:", game.guesses.length, "| Total Responses:", game.responses.length);
      console.log("[SERVER] Guesses array:", JSON.stringify(game.guesses, null, 2));
      console.log("[SERVER] Responses array:", JSON.stringify(game.responses, null, 2));
      console.log("========================================\n");

      io.to(game.hostId.toString()).emit("game-result", resultPayload);
      io.to(game.guestId.toString()).emit("game-result", resultPayload);

      activeGames.delete(gameId);
      void persistGameResult(game);
      return true;
    }
  }
  return false;
};

const calculateResponse = (guess, secretNumber) => {
  const normalizedGuess = String(guess || "").trim();
  const normalizedSecret = String(secretNumber || "").trim();

  let place = 0;
  let qty = 0;

  if (!normalizedSecret) return { place, qty };

  for (let i = 0; i < normalizedGuess.length; i++) {
    if (normalizedGuess[i] === normalizedSecret[i]) {
      place++;
    }
    if (normalizedSecret.includes(normalizedGuess[i])) {
      qty++;
    }
  }

  return { place, qty };
};

const buildResponseEntry = ({
  responderId,
  guess,
  secretNumber,
  forPlayerId,
  round,
}) => {
  const { place, qty } = calculateResponse(guess, secretNumber);

  return {
    responderId: String(responderId),
    guess: String(guess || "").trim(),
    place,
    qty,
    forPlayerId: String(forPlayerId),
    round: Number(round || 1),
  };
};

const advanceRoundIfComplete = (game) => {
  if (getCurrentRoundCorrectness(game).isRoundComplete) {
    game.currentRound = Number(game.currentRound || 1) + 1;
  }
};

const startServerTimer = (io, gameId) => {
  const game = activeGames.get(gameId);
  if (!game || game.status !== "active") return;

  clearServerTimer(game);

  const durationMinutes =
    game.phase === "guess" ? game.guessingTimer : game.responseTimer;
  const durationMs = durationMinutes * 60 * 1000;

  game.timerId = setTimeout(() => {
    triggerForfeit(io, gameId, game.currentTurn);
  }, durationMs);
};

const triggerForfeit = (io, gameId, playerId) => {
  const game = activeGames.get(gameId);
  if (!game || game.status !== "active") return;

  clearServerTimer(game);

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
};

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
    socket.on("send-game-request", async ({ toUserId, fromUser }) => {
      io.to(toUserId.toString()).emit("game-request", {
        fromUser,
        requestId: `${socket.userId}-${toUserId}-${Date.now()}`,
      });

      // Save game request notification to database
      try {
        const notification = await NotificationModel.create({
          recipient: toUserId,
          sender: socket.userId,
          type: "Game_request",
        });
        const populatedNotification = await notification.populate(
          "sender",
          "username avatar firstName lastName",
        );
        io.to(toUserId.toString()).emit(
          "new-notification",
          populatedNotification,
        );
      } catch (err) {
        console.error("Error creating game request notification:", err);
      }
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
      // Store ready state so late-joining opponents can catch up
      const lobbyKey = [socket.userId, toUserId].sort().join("-");
      if (!lobbyStates.has(lobbyKey)) lobbyStates.set(lobbyKey, new Set());
      lobbyStates.get(lobbyKey).add(String(socket.userId));

      io.to(toUserId.toString()).emit("opponent-ready");
    });

    socket.on("player-not-ready", ({ toUserId }) => {
      // Clear ready state
      const lobbyKey = [socket.userId, toUserId].sort().join("-");
      if (lobbyStates.has(lobbyKey)) {
        lobbyStates.get(lobbyKey).delete(String(socket.userId));
      }

      io.to(toUserId.toString()).emit("opponent-not-ready");
    });

    // ── Called when a player mounts the lobby page ──
    // Replays the current ready state to the joining socket so late joiners
    // immediately see whether their opponent has already locked in.
    // Also notifies the existing player that their opponent has arrived.
    socket.on("join-lobby", ({ opponentId }) => {
      const lobbyKey = [socket.userId, opponentId].sort().join("-");
      const readySet = lobbyStates.get(lobbyKey);
      if (readySet && readySet.has(String(opponentId))) {
        // Opponent already ready — tell the just-joined player
        socket.emit("opponent-ready");
      }
      // Tell the existing player that their opponent has entered the lobby
      io.to(opponentId.toString()).emit("opponent-joined-lobby");
    });

    // ── Called when a player intentionally exits the lobby ──
    // Notifies the opponent so they can update the UI.
    // If the leaving player was the HOST (original game-request sender),
    // the opponent also removes any pending game request from that user.
    socket.on("leave-lobby", ({ opponentId, isHost }) => {
      // Remove this player's ready state from the shared lobby entry
      const lobbyKey = [socket.userId, opponentId].sort().join("-");
      if (lobbyStates.has(lobbyKey)) {
        lobbyStates.get(lobbyKey).delete(String(socket.userId));
      }
      // Notify the opponent
      io.to(opponentId.toString()).emit("opponent-left-lobby", {
        wasHost: isHost, // true → opponent should also remove pending game request
        leavingUserId: socket.userId,
      });
    });

    // ────────────────────────────────────────────────
    // Start game session (host only)
    // ────────────────────────────────────────────────
    socket.on(
      "start-game-session",
      ({
        hostId,
        guestId,
        secretNumber,
        guessingTimer,
        responseTimer,
        autoCheck,
      }) => {
        // Only the host socket may start the game
        if (String(socket.userId) !== String(hostId)) {
          socket.emit("start-game-error", {
            message:
              "Only the player who sent the game request can start as host.",
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

        const game = buildGameState(
          hostId,
          guestId,
          guessingTimer,
          responseTimer,
          autoCheck,
        );
        // Store the host's secret number so we can check when guest guesses
        game.hostSecretNumber = String(secretNumber || "").trim();
        // Guest secret will be registered via register-secret event
        game.guestSecretNumber = "";
        activeGames.set(sessionKey, game);

        // Clean up lobby ready-state since game is now starting
        lobbyStates.delete(sessionKey);

        // Start the server-side turn timer!
        startServerTimer(io, sessionKey);

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
          autoCheck: game.autoCheck,
          currentRound: game.currentRound,
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
      },
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
      const opponentId =
        String(playerId) === String(game.hostId) ? game.guestId : game.hostId;
      const opponentSecret =
        String(playerId) === String(game.hostId)
          ? game.guestSecretNumber
          : game.hostSecretNumber;
      const guessRound = Number(game.currentRound || 1);

      // Record the guess
      game.guesses.push({
        playerId: String(playerId),
        guess: normalizedGuess,
        round: guessRound,
      });

      // If autoCheck is active, calculate response and submit immediately
      if (game.autoCheck) {
        const opponentSecretVal = String(opponentSecret || "").trim();
        const responseEntry = buildResponseEntry({
          responderId: String(opponentId),
          guess: normalizedGuess,
          forPlayerId: String(playerId),
          secretNumber: opponentSecretVal,
          round: guessRound,
        });

        game.responses.push(responseEntry);

        // Emit turn-updated with the latest guess/response first so client displays them
        const turnPayload = {
          phase: game.phase,
          currentTurn: game.currentTurn,
          latestResponse: responseEntry,
          guesses: game.guesses,
          responses: game.responses,
          guessingTimer: game.guessingTimer,
          responseTimer: game.responseTimer,
          autoCheck: game.autoCheck,
          currentRound: game.currentRound,
        };
        io.to(game.hostId.toString()).emit("turn-updated", turnPayload);
        io.to(game.guestId.toString()).emit("turn-updated", turnPayload);

        // Check if round should end
        const ended = checkRoundEnd(io, game, gameId);
        if (ended) return;
        advanceRoundIfComplete(game);

        // Transition turn back to guess phase for the opponent
        game.phase = "guess";
        game.currentTurn = String(opponentId);
        game.pendingGuessFor = null;

        startServerTimer(io, gameId);

        const nextTurnPayload = {
          phase: game.phase,
          currentTurn: game.currentTurn,
          latestResponse: responseEntry,
          guesses: game.guesses,
          responses: game.responses,
          guessingTimer: game.guessingTimer,
          responseTimer: game.responseTimer,
          autoCheck: game.autoCheck,
          currentRound: game.currentRound,
        };

        io.to(game.hostId.toString()).emit("turn-updated", nextTurnPayload);
        io.to(game.guestId.toString()).emit("turn-updated", nextTurnPayload);
        return;
      }

      // ── Not autoCheck: switch to response phase ──
      // The OTHER player (opponent) must respond to this guess
      const { hostCorrect, guestCorrect, isRoundComplete } =
        getCurrentRoundCorrectness(game);

      // In manual mode, the second guess completes the round. If either player
      // is correct, calculate the second guess response on the server and end now.
      if (isRoundComplete && (hostCorrect || guestCorrect)) {
        const responseEntry = buildResponseEntry({
          responderId: String(opponentId),
          guess: normalizedGuess,
          forPlayerId: String(playerId),
          secretNumber: opponentSecret,
          round: guessRound,
        });

        game.responses.push(responseEntry);

        // Emit turn-updated first so client displays the last guess/response
        const turnPayload = {
          phase: game.phase,
          currentTurn: game.currentTurn,
          latestResponse: responseEntry,
          guesses: game.guesses,
          responses: game.responses,
          guessingTimer: game.guessingTimer,
          responseTimer: game.responseTimer,
          autoCheck: game.autoCheck,
          currentRound: game.currentRound,
        };
        io.to(game.hostId.toString()).emit("turn-updated", turnPayload);
        io.to(game.guestId.toString()).emit("turn-updated", turnPayload);

        const ended = checkRoundEnd(io, game, gameId);
        if (ended) return;
      }

      game.pendingGuessFor = String(playerId); // who guessed
      game.phase = "response";
      game.currentTurn = String(opponentId); // opponent must respond

      startServerTimer(io, gameId);

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
        autoCheck: game.autoCheck,
        currentRound: game.currentRound,
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
      const guessEntry = game.guesses[game.guesses.length - 1];
      const guessBeingAnswered = guessEntry?.guess || "";
      const responseRound = Number(guessEntry?.round || game.currentRound || 1);
      const originalGuesserId = game.pendingGuessFor; // who originally guessed
      const secretBeingGuessed =
        String(originalGuesserId) === String(game.hostId)
          ? game.guestSecretNumber
          : game.hostSecretNumber;
      const actualResponse = calculateResponse(
        guessBeingAnswered,
        secretBeingGuessed,
      );

      console.log("Manual response checked before continuing:", {
        gameId,
        guess: guessBeingAnswered,
        secret: secretBeingGuessed,
        submitted: { place: Number(place), qty: Number(qty) },
        actual: actualResponse,
      });

      const responseEntry = {
        responderId: String(playerId),
        guess: guessBeingAnswered,
        place: actualResponse.place,
        qty: actualResponse.qty,
        forPlayerId: originalGuesserId, // the guesser receives this response
        round: responseRound,
      };

      game.responses.push(responseEntry);

      // Emit turn-updated first so client displays the last guess/response
      const intermediatePayload = {
        phase: game.phase,
        currentTurn: game.currentTurn,
        latestResponse: responseEntry,
        guesses: game.guesses,
        responses: game.responses,
        guessingTimer: game.guessingTimer,
        responseTimer: game.responseTimer,
        autoCheck: game.autoCheck,
        currentRound: game.currentRound,
      };
      io.to(game.hostId.toString()).emit("turn-updated", intermediatePayload);
      io.to(game.guestId.toString()).emit("turn-updated", intermediatePayload);

      // Check if round should end
      const ended = checkRoundEnd(io, game, gameId);
      if (ended) return;
      advanceRoundIfComplete(game);

      // ── After responding, the RESPONDER becomes the next GUESSER ──
      // Cycle: Host guesses → Guest responds → Guest guesses → Host responds → ...
      game.phase = "guess";
      game.currentTurn = String(playerId); // The responder now guesses
      game.pendingGuessFor = null;

      startServerTimer(io, gameId);

      const turnPayload = {
        phase: game.phase,
        currentTurn: game.currentTurn,
        latestResponse: responseEntry,
        guesses: game.guesses,
        responses: game.responses,
        guessingTimer: game.guessingTimer,
        responseTimer: game.responseTimer,
        autoCheck: game.autoCheck,
        currentRound: game.currentRound,
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
      triggerForfeit(io, gameId, playerId);
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
        clearServerTimer(game);
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
    // Send Chat Message
    // ────────────────────────────────────────────────
    socket.on("send-chat-message", ({ gameId, message }) => {
      const game = activeGames.get(gameId);
      if (!game) return;

      const opponentId =
        String(socket.userId) === String(game.hostId)
          ? game.guestId
          : game.hostId;

      // Record message to in-memory game history
      if (!game.chat) game.chat = [];
      game.chat.push({
        senderId: String(socket.userId),
        message: message,
        timestamp: new Date(),
      });

      io.to(opponentId.toString()).emit("chat-message", {
        senderId: socket.userId,
        message: message,
      });
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
    const isDraw = Boolean(game.isDraw);

    await GameHistory.create({
      gameId,
      players: [game.hostId, game.guestId],
      winner: isDraw ? undefined : game.winner,
      loser: isDraw ? undefined : game.loser,
      isDraw,
      reason: game.reason || "guess",
      pointsAwarded: isDraw ? 0 : 3,
      guesses: game.guesses || [],
      responses: game.responses || [],
      chat: game.chat || [],
      hostId: game.hostId,
      guestId: game.guestId,
      hostSecretNumber: game.hostSecretNumber || "",
      guestSecretNumber: game.guestSecretNumber || "",
      autoCheck: game.autoCheck || false,
      guessingTimer: game.guessingTimer || 3,
      responseTimer: game.responseTimer || 3,
      startedAt: game.startedAt || new Date(),
      endedAt: new Date(),
    });

    if (isDraw) {
      await User.findByIdAndUpdate(game.hostId, {
        $inc: { "stats.totalGames": 1 },
      });
      await User.findByIdAndUpdate(game.guestId, {
        $inc: { "stats.totalGames": 1 },
      });
    } else {
      if (game.winner) {
        await User.findByIdAndUpdate(game.winner, {
          $inc: { "stats.points": 3, "stats.wins": 1, "stats.totalGames": 1 },
        });
      }
      if (game.loser) {
        await User.findByIdAndUpdate(game.loser, {
          $inc: { "stats.losses": 1, "stats.totalGames": 1 },
        });
      }
    }
  } catch (error) {
    console.error("Failed to persist game result", error);
  }
};
