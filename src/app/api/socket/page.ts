// pages/api/socket.js

import { Server } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if ((res.socket as any).server.io) {
    console.log('Socket is already attached');
    return res.end();
  }

  if (!res.socket) {
    throw new Error('Socket is not available');
  }
const io = new Server((res.socket as any).server);
(res.socket as any).server.io = io;

  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);
  
    // Triggered when a peer hits the join room button.
    socket.on("join", (roomName: string) => {
      const { rooms } = io.sockets.adapter;
      const room = rooms.get(roomName);
  
      // room == undefined when no such room exists.
      if (room === undefined) {
        socket.join(roomName);
        socket.emit("created");
      } else if (room.size === 1) {
        // room.size == 1 when one person is inside the room.
        socket.join(roomName);
        socket.emit("joined");
      } else {
        // when there are already two people inside the room.
        socket.emit("full");
      }
      console.log(rooms);
    });
  
    // Triggered when the person who joined the room is ready to communicate.
    socket.on("ready", (roomName: string) => {
      socket.broadcast.to(roomName).emit("ready"); // Informs the other peer in the room.
    });
  
    // Triggered when server gets an icecandidate from a peer in the room.
    socket.on("ice-candidate", (candidate: RTCIceCandidate, roomName: string) => {
      console.log(candidate);
      socket.broadcast.to(roomName).emit("ice-candidate", candidate); // Sends Candidate to the other peer in the room.
    });
  
    // Triggered when server gets an offer from a peer in the room.
    socket.on("offer", (offer: RTCSessionDescriptionInit, roomName: string) => {
      socket.broadcast.to(roomName).emit("offer", offer); // Sends Offer to the other peer in the room.
    });
  
    // Triggered when server gets an answer from a peer in the room.
    socket.on("answer", (answer: RTCSessionDescriptionInit, roomName: string) => {
      socket.broadcast.to(roomName).emit("answer", answer); // Sends Answer to the other peer in the room.
    });

    socket.on("leave", (roomName: string) => {
      socket.leave(roomName);
      socket.broadcast.to(roomName).emit("leave");
    });

  });
  return res.end();
};

export default SocketHandler;
