"use client"
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings, MessageSquare, Users, MoreVertical, Copy, Check, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// A single participant's video tile
const VideoTile = React.memo(({ stream, name, isMuted, isLocal }: { stream: MediaStream, name: string, isMuted: boolean, isLocal: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 shadow-lg border-2 border-gray-700/60 aspect-video group">
      <video ref={videoRef} autoPlay playsInline muted={isLocal || isMuted} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Can add info here if needed */}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-semibold drop-shadow-lg">{name}</p>
          {isMuted && <MicOff className="w-5 h-5 text-red-400 bg-black/50 rounded-full p-1" />}
        </div>
      </div>
    </div>
  );
});

type RoomState = 'idle' | 'joining' | 'joined' | 'error';
type Participant = { id: string; role: 'host' | 'member' };

const RoomPage: React.FC = () => {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || 'test-room';

  // Core state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Media and UI state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);

  // Refs
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // 1. Initialize Socket Connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001', { reconnection: true });
    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, []);

  // 2. Main useEffect for Socket Event Handlers
  useEffect(() => {
    if (!socket || !localStream) return;

    // Fired when YOU successfully join the room
    const handleRoomJoined = ({ participants: initialParticipants }: { participants: Participant[] }) => {
      console.log('Successfully joined room. Participants:', initialParticipants);
      setParticipants(initialParticipants);
      setRoomState('joined');
      
      // For every existing participant, create and send an offer
      initialParticipants.forEach(p => {
        if (p.id !== socket.id) {
          createPeerConnection(p.id, true);
        }
      });
    };

    // Fired when a NEW participant joins the room
    const handleParticipantJoined = ({ participantId, role }: { participantId: string, role: 'host' | 'member' }) => {
      console.log(`New participant ${participantId} joined.`);
      setParticipants(prev => [...prev, { id: participantId, role }]);
      // The new participant will send us an offer, we just prepare a connection
      createPeerConnection(participantId, false);
    };

    // Fired when a participant leaves
    const handleParticipantLeft = ({ participantId }: { participantId: string }) => {
      console.log(`Participant ${participantId} left.`);
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

    // Handle incoming WebRTC signals
    const handleSignal = async ({ from, data }: { from: string, data: any }) => {
      const pc = peerConnectionsRef.current.get(from);
      if (!pc) return console.error('No peer connection for sender:', from);

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

    socket.on('room-joined', handleRoomJoined);
    socket.on('participant-joined', handleParticipantJoined);
    socket.on('participant-left', handleParticipantLeft);
    socket.on('signal', handleSignal);
    socket.on('error', (e) => { setError(e.message); setRoomState('error'); });

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('participant-joined', handleParticipantJoined);
      socket.off('participant-left', handleParticipantLeft);
      socket.off('signal', handleSignal);
      socket.off('error');
    };
  }, [socket, localStream, roomId]);

  useEffect(() => {
    if (!socket) return;

    const handleMuteStatusChanged = ({ participantId, isMuted }: { participantId: string, isMuted: boolean }) => {
        setParticipants(prev =>
            prev.map(p =>
                p.id === participantId ? { ...p, isMuted } : p
            )
        );
    };

    socket.on('mute-status-changed', handleMuteStatusChanged);

    return () => {
        socket.off('mute-status-changed', handleMuteStatusChanged);
    };
  }, [socket]);

  const createPeerConnection = (participantId: string, shouldCreateOffer: boolean) => {
    if (peerConnectionsRef.current.has(participantId)) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('signal', { target: participantId, data: e.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log(`Track received from ${participantId}`);
      setRemoteStreams(prev => new Map(prev).set(participantId, event.streams[0]));
    };

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }
    
    peerConnectionsRef.current.set(participantId, pc);

    if (shouldCreateOffer && socket) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('signal', { target: participantId, data: pc.localDescription });
          console.log(`Offer sent to ${participantId}`);
        })
        .catch(e => console.error("Error creating offer:", e));
    }
    return pc;
  };

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
    socket?.disconnect(); // Disconnect triggers cleanup on server
    
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    setRemoteStreams(new Map());
    setParticipants([]);
    setRoomState('idle');
  };

  useEffect(() => {
    localStream?.getAudioTracks().forEach(track => track.enabled = !isMicMuted);
  }, [isMicMuted, localStream]);

  useEffect(() => {
    localStream?.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
  }, [isVideoOff, localStream]);

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Render Logic ---

  if (roomState === 'idle' || roomState === 'error') {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center text-white">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold mb-8">Join Room: {roomId}</h2>
          <div className="space-y-4">
            <button onClick={() => joinRoom('host')} className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all">Join as Host</button>
            <button onClick={() => joinRoom('member')} className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">Join as Member</button>
          </div>
          {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  if (roomState === 'joining') {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-gray-200 ml-4">Joining room...</p>
      </div>
    );
  }

  const remoteStreamValues = Array.from(remoteStreams.entries());
  const participantCount = remoteStreamValues.length + (localStream ? 1 : 0);

  const getGridClasses = (count: number): string => {
    const baseClasses = "grid gap-4 mx-auto";
    if (count === 1) return `${baseClasses} grid-cols-1 max-w-4xl`;
    
    const responsiveClasses = 
      count <= 2 ? "grid-cols-1 sm:grid-cols-2" :
      count <= 4 ? "grid-cols-2" :
      count <= 6 ? "grid-cols-2 md:grid-cols-3" :
      count <= 9 ? "grid-cols-3" :
      "grid-cols-3 md:grid-cols-4";

    return `${baseClasses} ${responsiveClasses} max-w-7xl`;
  };

  return (
    <div className="h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex flex-col text-white relative">
      <div className="flex-1 p-4 overflow-y-auto flex items-center">
        <div className={getGridClasses(participantCount)}>
          {localStream && <VideoTile stream={localStream} name={`You (${participants.find(p=>p.id === socket?.id)?.role})`} isMuted={isMicMuted} isLocal={true} />}
          {remoteStreamValues.map(([id, stream]) => (
            <VideoTile key={id} stream={stream} name={`User ${id.substring(0, 6)}`} isMuted={false} isLocal={false} />
          ))}
        </div>
      </div>

      {/* Participants Panel */}
      {showParticipantsPanel && (
        <div className="absolute top-0 right-0 h-full w-80 bg-gray-900/90 backdrop-blur-sm border-l border-gray-800 z-20 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-200">Participants ({participants.length})</h3>
            <button onClick={() => setShowParticipantsPanel(false)} className="p-2 rounded-full hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="space-y-3">
            {participants.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800">
                <p className="text-gray-300 truncate">{p.id === socket?.id ? 'You' : `User-${p.id.substring(0, 6)}`}</p>
                <p className="text-gray-400 text-sm capitalize flex-shrink-0 ml-2">{p.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-black/50 border-t border-gray-800 p-4 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button onClick={copyRoomId} className="p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2">
                <span className='text-gray-300 font-mono text-sm'>{roomId}</span>
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => setIsMicMuted(!isMicMuted)} className={`p-3 rounded-full ${isMicMuted ? 'bg-red-500/20' : 'bg-gray-800'} border border-gray-700 hover:bg-gray-700 transition-colors`} aria-label={isMicMuted ? "Unmute" : "Mute"}>{isMicMuted ? <MicOff className="w-6 h-6 text-red-400" /> : <Mic className="w-6 h-6" />}</button>
              <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500/20' : 'bg-gray-800'} border border-gray-700 hover:bg-gray-700 transition-colors`} aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}>{isVideoOff ? <VideoOff className="w-6 h-6 text-red-400" /> : <Video className="w-6 h-6" />}</button>
              <button onClick={() => setShowParticipantsPanel(true)} className="p-3 rounded-full bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors" aria-label="Show participants"><Users className="w-6 h-6" /></button>
              <button className="p-3 rounded-full bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors" aria-label="Open settings"><Settings className="w-6 h-6" /></button>
            </div>
            <button onClick={leaveRoom} className="p-3 rounded-full bg-red-500/20 border border-red-500/20 hover:bg-red-500/30 transition-colors" aria-label="Leave call"><PhoneOff className="w-6 h-6 text-red-400" /></button>
        </div>
      </div>
    </div>
  );
};
export default RoomPage;     