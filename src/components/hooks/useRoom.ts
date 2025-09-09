'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Participant, RoomState } from '../lib/types';

export const useRoom = (roomId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Initialize Socket Connection
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'http://localhost:3001', { reconnection: true });
    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, []);

  const createPeerConnection = useCallback((participantId: string, shouldCreateOffer: boolean) => {
    if (!socket || !localStream || peerConnectionsRef.current.has(participantId)) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('signal', { target: participantId, data: e.candidate });
    };

    pc.ontrack = (event) => {
      console.log(`Track received from ${participantId}`);
      setRemoteStreams(prev => new Map(prev).set(participantId, event.streams[0]));
    };

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    
    peerConnectionsRef.current.set(participantId, pc);

    if (shouldCreateOffer) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => { socket.emit('signal', { target: participantId, data: pc.localDescription }); })
        .catch(e => console.error("Error creating offer:", e));
    }
  }, [socket, localStream]);

  // Main useEffect for Socket Event Handlers
  useEffect(() => {
    if (!socket || !localStream) return;

    const handleRoomJoined = ({ participants: initialParticipants }: { participants: Participant[] }) => {
      setParticipants(initialParticipants);
      setRoomState('joined');
      initialParticipants.forEach(p => {
        if (p.id !== socket.id) createPeerConnection(p.id, true);
      });
    };

    const handleParticipantJoined = ({ participantId, role }: { participantId: string, role: 'host' | 'member' }) => {
      setParticipants(prev => [...prev, { id: participantId, role, isMuted: false }]);
      createPeerConnection(participantId, false);
    };

    const handleParticipantLeft = ({ participantId }: { participantId: string }) => {
      if (peerConnectionsRef.current.has(participantId)) {
        peerConnectionsRef.current.get(participantId)?.close();
        peerConnectionsRef.current.delete(participantId);
      }
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(participantId);
        return newStreams;
      });
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    };

    const handleSignal = async ({ from, data }: { from: string, data: any }) => {
      const pc = peerConnectionsRef.current.get(from);
      if (!pc) return;
      try {
        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { target: from, data: answer });
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        }
      } catch (error) {
        console.error('Error handling signal:', error);
      }
    };
    
    const handleMuteStatusChanged = ({ participantId, isMuted }: { participantId: string, isMuted: boolean }) => {
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, isMuted } : p));
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('participant-joined', handleParticipantJoined);
    socket.on('participant-left', handleParticipantLeft);
    socket.on('signal', handleSignal);
    socket.on('mute-status-changed', handleMuteStatusChanged);
    socket.on('error', (e) => { setError(e.message); setRoomState('error'); });

    return () => {
      socket.off('room-joined');
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('signal');
      socket.off('mute-status-changed');
      socket.off('error');
    };
  }, [socket, localStream, roomId, createPeerConnection]);

  // Media track enable/disable effects
  useEffect(() => {
    localStream?.getAudioTracks().forEach(track => track.enabled = !isMicMuted);
  }, [isMicMuted, localStream]);

  useEffect(() => {
    localStream?.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
  }, [isVideoOff, localStream]);

  const joinRoom = async (role: 'host' | 'member') => {
    if (!socket) return setError("Socket not connected.");
    setRoomState('joining');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      socket.emit('join-room', { roomId, role });
    } catch (err) {
      setError('Failed to access camera/microphone. Please check permissions.');
      setRoomState('error');
    }
  };

  const leaveRoom = () => {
    socket?.disconnect();
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());
    setParticipants([]);
    setRoomState('idle');
  };

  const toggleMute = () => {
    const newMutedState = !isMicMuted;
    setIsMicMuted(newMutedState);
    socket?.emit('mute-status-changed', { isMuted: newMutedState });
  };

  const toggleVideo = () => {
    setIsVideoOff(prev => !prev);
  };

  return {
    socket,
    roomState,
    error,
    participants,
    localStream,
    remoteStreams,
    isMicMuted,
    isVideoOff,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo
  };
};
