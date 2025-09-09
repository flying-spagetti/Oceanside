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
  let currentRoomId: string | null = null;

  socket.on("join-room", ({ roomId, role }: { roomId: string; role: 'host' | 'member' }) => {
    // Validate room ID format
    if (!roomId || typeof roomId !== 'string' || roomId.length < 3) {
      return socket.emit('error', { message: 'Invalid room ID' });
    }

    // Check if room exists
    if (!rooms[roomId]) {
      if (role === 'member') {
        return socket.emit('error', { message: 'Room does not exist' });
      }
      // Create new room if host
      rooms[roomId] = {
        id: roomId,
        participants: new Map(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
        hostId: socket.id
      };
      console.log(`Room ${roomId} created by host ${socket.id}`);
    } else {
      // If joining as host but room already has a host
      if (role === 'host' && rooms[roomId].hostId) {
        return socket.emit('error', { message: 'Room already has a host' });
      }
    }

    // Add participant to room
    rooms[roomId].participants.set(socket.id, {
      id: socket.id,
      role,
      joinedAt: Date.now()
    });
    rooms[roomId].lastActivity = Date.now();
    currentRoomId = roomId; // Keep track of the user's room

    // If joining as host, set as host
    if (role === 'host') {
      rooms[roomId].hostId = socket.id;
    }

    socket.join(roomId);

    // Notify all participants in the room about the new participant
    // Important for existing clients to initiate connections with the new one
    socket.to(roomId).emit('participant-joined', {
      participantId: socket.id,
      role,
    });

    // Send full participant list to the new participant
    socket.emit('room-joined', {
      roomId,
      role,
      participants: Array.from(rooms[roomId].participants.values())
    });

    console.log(`Client ${socket.id} joined room ${roomId}. Room now has ${rooms[roomId].participants.size} clients.`);
  });

  // Handle signaling - now targeted
  socket.on("signal", ({ target, data }) => {
    try {
      if (!target || !data) {
        return socket.emit('error', { message: 'Invalid signal payload' });
      }
      // Relay signal to the specific target client
      io.to(target).emit("signal", {
        from: socket.id,
        data,
      });
      // console.log(`Relayed signal from ${socket.id} to ${target}`); // A bit too noisy for production
    } catch (error) {
      console.error('Error handling signal:', error);
      socket.emit('error', { message: 'Error processing signal' });
    }
  });

  socket.on("mute-status-changed", ({ isMuted }: { isMuted: boolean }) => {
    if (currentRoomId && rooms[currentRoomId]) {
        const participant = rooms[currentRoomId].participants.get(socket.id);
        if (participant) {
            participant.isMuted = isMuted;
            socket.to(currentRoomId).emit("mute-status-changed", {
                participantId: socket.id,
                isMuted: isMuted,
            });
        }
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Client ${socket.id} disconnected.`);
    if (currentRoomId && rooms[currentRoomId]) {
      const roomId = currentRoomId;
      const participant = rooms[roomId].participants.get(socket.id);
      rooms[roomId].participants.delete(socket.id);

      // If host disconnects, assign new host or close room
      if (participant?.role === 'host') {
        const remainingParticipants = Array.from(rooms[roomId].participants.values());
        if (remainingParticipants.length > 0) {
          const newHost = remainingParticipants.sort((a, b) => a.joinedAt - b.joinedAt)[0]; // Oldest member becomes host
          rooms[roomId].hostId = newHost.id;
          io.to(roomId).emit('host-changed', { newHostId: newHost.id });
          console.log(`Host ${socket.id} disconnected. New host is ${newHost.id}`);
        } else {
          console.log(`Room ${roomId} is empty, removing.`);
          delete rooms[roomId];
        }
      }

      // Notify remaining participants
      if (rooms[roomId]) {
        io.to(roomId).emit('participant-left', {
          participantId: socket.id,
        });
        console.log(`Notified room ${roomId} of participant ${socket.id} leaving.`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});