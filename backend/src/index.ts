// server.ts
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuidv4 } from 'uuid';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { 
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] // Add your production domain
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
});

interface Participant {
  id: string;
  role: 'host' | 'member';
  joinedAt: number;
}

interface Room {
  id: string;
  participants: Map<string, Participant>;
  createdAt: number;
  lastActivity: number;
  hostId: string | null;
}

const rooms: Record<string, Room> = {};
const ROOM_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cleanup expired rooms periodically
setInterval(() => {
  const now = Date.now();
  Object.entries(rooms).forEach(([roomId, room]) => {
    if (now - room.lastActivity > ROOM_EXPIRY) {
      console.log(`Room ${roomId} expired, removing`);
      delete rooms[roomId];
    }
  });
}, 60 * 60 * 1000); // Check every hour

io.on("connection", (socket) => {
  console.log('Client connected:', socket.id);

  socket.on("join-room", ({ roomId, role }: { roomId: string; role: 'host' | 'member' }) => {
    // Validate room ID format
    if (!roomId || typeof roomId !== 'string' || roomId.length < 3) {
      socket.emit('error', { message: 'Invalid room ID' });
      return;
    }

    // Check if room exists
    if (!rooms[roomId]) {
      if (role === 'member') {
        socket.emit('error', { message: 'Room does not exist' });
        return;
      }
      // Create new room if host
      rooms[roomId] = {
        id: roomId,
        participants: new Map(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
        hostId: socket.id
      };
    } else {
      // Check if room is full (max 2 participants)
      if (rooms[roomId].participants.size >= 2) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // If joining as host but room already has a host
      if (role === 'host' && rooms[roomId].hostId) {
        socket.emit('error', { message: 'Room already has a host' });
        return;
      }
    }

    // Add participant to room
    rooms[roomId].participants.set(socket.id, {
      id: socket.id,
      role,
      joinedAt: Date.now()
    });
    rooms[roomId].lastActivity = Date.now();

    // If joining as host, set as host
    if (role === 'host') {
      rooms[roomId].hostId = socket.id;
    }

    socket.join(roomId);

    // Notify all participants in the room about the new participant
    io.to(roomId).emit('participant-joined', {
      participantId: socket.id,
      role,
      participants: Array.from(rooms[roomId].participants.values())
    });

    // Send room info to the new participant
    socket.emit('room-joined', {
      roomId,
      role,
      participants: Array.from(rooms[roomId].participants.values())
    });

    console.log(`Room ${roomId} now has ${rooms[roomId].participants.size} clients`);

    // Handle signaling
    socket.on("signal", ({ roomId: signalRoomId, data }) => {
      try {
        // Validate that the sender is in the room
        if (!rooms[signalRoomId]?.participants.has(socket.id)) {
          socket.emit('error', { message: 'Not authorized to send signals to this room' });
          return;
        }

        // Validate signal data
        if (!data) {
          socket.emit('error', { message: 'Invalid signal data' });
          return;
        }

        console.log(`Signal from ${socket.id} in room ${signalRoomId}:`, data.type || 'ICE candidate');
        
        // Send signal to all other participants in the room
        socket.to(signalRoomId).emit("signal", { 
          data,
          from: socket.id
        });
      } catch (error) {
        console.error('Error handling signal:', error);
        socket.emit('error', { message: 'Error processing signal' });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Client ${socket.id} disconnected from room ${roomId}`);
      if (rooms[roomId]) {
        const participant = rooms[roomId].participants.get(socket.id);
        rooms[roomId].participants.delete(socket.id);

        // If host disconnects, assign new host or close room
        if (participant?.role === 'host') {
          const remainingParticipants = Array.from(rooms[roomId].participants.values());
          if (remainingParticipants.length > 0) {
            // Assign first remaining participant as host
            const newHost = remainingParticipants[0];
            rooms[roomId].hostId = newHost.id;
            io.to(roomId).emit('host-changed', { newHostId: newHost.id });
          } else {
            // No participants left, remove room
            delete rooms[roomId];
          }
        }

        // Notify remaining participants
        if (rooms[roomId]) {
          io.to(roomId).emit('participant-left', {
            participantId: socket.id,
            participants: Array.from(rooms[roomId].participants.values())
          });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
