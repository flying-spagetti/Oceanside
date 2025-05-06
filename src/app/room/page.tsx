"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export default function WebRTCClient() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket: Socket = io("http://localhost:3001");
    const peerConnection = new RTCPeerConnection();
    const roomId = "oceanside-room-1";
    let isInitiator = false;
  
    socket.emit("join-room", roomId);
  
    socket.on("peer-joined", async () => {
      console.log("Another peer joined, I'm the initiator");
      isInitiator = true;
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("signal", { roomId, data: offer });
    });
  
    socket.on("signal", async ({ data }) => {
      if (data.type === "offer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("signal", { roomId, data: answer });
      } else if (data.type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  
    peerConnection.onicecandidate = (e) => {
      if (e.candidate) socket.emit("signal", { roomId, data: e.candidate });
    };
  
    peerConnection.ontrack = (event) => {
      console.log("Track received", event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
  
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    });
  }, []);
  

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f1f3f4" }}>
      <h2>Oceanside</h2>
      <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "45%" }} />
      <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "45%" }} />
    </div>
  );
}
