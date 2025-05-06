import { createServer } from "http";
import { Server } from "socket.io";
import Fastify from "fastify";

const fastify = Fastify();
const httpServer = createServer(fastify.server);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow CORS for dev, tighten for prod
  },
});

// --- Socket.IO Logic ---
io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    socket.to(roomId).emit("peer-joined", { id: socket.id });
  });

  socket.on("signal", ({ roomId, data }) => {
    socket.to(roomId).emit("signal", { data });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

httpServer.listen(3001, () => {
  console.log("Signaling server running at http://localhost:3001");
});
