export const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    // 🔥 Join user room
    socket.join(socket.userId.toString());

    console.log("👤 User joined room:", socket.userId);

    const request = {
      name: "Mati",
      Year: 2026,
      Age: 21,
    };

    // socket.on("new-friend-request", (data) => {
    //   console.log("confrimatio", data);
    //   const { userId } = data;
    //   io.to(userId).emit("back", request);
    // });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
};
