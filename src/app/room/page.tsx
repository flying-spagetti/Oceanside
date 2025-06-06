"use client"
import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings, MessageSquare, Users, MoreVertical, Copy, Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const RoomPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const roomId = searchParams.get('room') || 'test-room';
  const [role, setRole] = React.useState<'host' | 'member' | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);
  const [participants, setParticipants] = React.useState<Array<{ id: string; role: 'host' | 'member' }>>([]);
  const [localStats, setLocalStats] = React.useState<{
    videoBitrate: number;
    audioBitrate: number;
    videoResolution: string;
    frameRate: number;
    audioLevel: number;
  }>({
    videoBitrate: 0,
    audioBitrate: 0,
    videoResolution: '0x0',
    frameRate: 0,
    audioLevel: 0,
  });
  const [connectionState, setConnectionState] = React.useState<string>('new');
  const [isOfferer, setIsOfferer] = React.useState(false);
  const [isMicMuted, setIsMicMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showRoomInfo, setShowRoomInfo] = React.useState(false);

  // Function to get video resolution
  const getVideoResolution = (video: HTMLVideoElement) => {
    return `${video.videoWidth}x${video.videoHeight}`;
  };

  // Function to calculate audio level
  const calculateAudioLevel = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const calculateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      return average;
    };

    return calculateLevel();
  };

  // Function to update stats
  const updateStats = async () => {
    if (!peerConnectionRef.current) return;

    const stats = await peerConnectionRef.current.getStats();
    let videoBitrate = 0;
    let audioBitrate = 0;

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        videoBitrate = report.bytesReceived * 8 / 1000; // kbps
      }
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        audioBitrate = report.bytesReceived * 8 / 1000; // kbps
      }
    });

    if (localVideoRef.current) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      if (stream) {
        const audioLevel = calculateAudioLevel(stream);
        setLocalStats({
          videoBitrate,
          audioBitrate,
          videoResolution: getVideoResolution(localVideoRef.current),
          frameRate: 30, // This is an approximation, actual frame rate would need more complex calculation
          audioLevel,
        });
      }
    }
  };

  // Start stats monitoring
  React.useEffect(() => {
    const statsInterval = setInterval(updateStats, 1000);
    return () => clearInterval(statsInterval);
  }, []);

  const createPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });

    setupPeerConnection(pc);
    peerConnectionRef.current = pc;
    return pc;
  };

  const setupPeerConnection = (pc: RTCPeerConnection) => {
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('New ICE candidate:', e.candidate);
        socket?.emit('signal', { roomId, data: e.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', pc.iceConnectionState);
      setConnectionState(pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'connected') {
        setIsConnected(true);
        setError(null);
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setIsConnected(false);
        setError('Connection lost. Attempting to reconnect...');
        // Attempt to reconnect
        setError("Connection Lost, Please refresh the page");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection State:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        setError('Connection failed. Please refresh the page.');
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        console.log('Setting remote video stream');
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(console.error);
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log('ICE Gathering State:', pc.iceGatheringState);
    };

    pc.onsignalingstatechange = () => {
      console.log('Signaling State:', pc.signalingState);
    };
  };

  const initializeSocket = () => {
    const newSocket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: false, // Don't connect automatically
    });

    newSocket.on('error', ({ message }) => {
      setError(message);
      setIsJoining(false);
    });

    newSocket.on('connect_error', (err) => {
      setError('Failed to connect to signaling server');
      setIsJoining(false);
    });

    newSocket.on('disconnect', () => {
      setError('Connection lost. Please refresh the page.');
      setIsConnected(false);
    });

    setSocket(newSocket);
    return newSocket;
  };

  const joinRoom = async (selectedRole: 'host' | 'member') => {
    let activeSocket = socket;
  
    if (!activeSocket) {
      activeSocket = initializeSocket();
      activeSocket.connect();
  
      await new Promise<void>((resolve) => {
        activeSocket!.on('connect', () => {
          console.log('Socket connected');
          resolve();
        });
      });
  
      setSocket(activeSocket); // Update state AFTER connect
    }
  
    setIsJoining(true);
    setError(null);
    setRole(selectedRole);
    setConnectionState('connecting');
  
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(console.error);
        console.log('Camera Access Granted');
      }
    
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    
      activeSocket.emit('join-room', { roomId, role: selectedRole });
    } catch (err: any) {
      console.error("Camera Access Denied error:", err.name, err.message);
      setError('Failed to access camera/microphone. Please check permissions.');
      setIsJoining(false);
      setConnectionState('failed');
    }
    
  

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    }
  };

  useEffect(() => {
    if (!socket) return;



    socket.on('participant-joined', ({ participants: roomParticipants }) => {
      console.log('New participant joined:', roomParticipants);
      setParticipants(roomParticipants);
    });

    socket.on('participant-left', ({ participants: roomParticipants }) => {
      console.log('Participant left:', roomParticipants);
      setParticipants(roomParticipants);
      // Reset remote video if all participants left
      if (roomParticipants.length === 0 && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    socket.on('host-changed', ({ newHostId }) => {
      console.log('Host changed to:', newHostId);
      setParticipants(prev => 
        prev.map(p => p.id === newHostId ? { ...p, role: 'host' } : p)
      );
    });

    socket.on('signal', async ({ data }) => {
      try {
        console.log('Received signal:', data.type || 'ICE candidate');
        if (!peerConnectionRef.current) {
          console.error('No peer connection available');
          return;
        }

        socket.on('signal', async ({ data }) => {
          try {
            if (!peerConnectionRef.current || peerConnectionRef.current.signalingState === 'closed') {
              console.warn('Peer connection missing or closed. Re-creating...');
              const pc = createPeerConnection();
              peerConnectionRef.current = pc;
            }
        
            const pc = peerConnectionRef.current;
        
            if (data.type === 'offer') {
              console.log('Processing offer');
              await pc.setRemoteDescription(new RTCSessionDescription(data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              console.log('Sending answer');
              socket.emit('signal', { roomId, data: answer });
            } else if (data.type === 'answer') {
              console.log('Processing answer');
              await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (data.candidate) {
              console.log('Processing ICE candidate');
              await pc.addIceCandidate(new RTCIceCandidate(data));
            }
          } catch (error) {
            console.error('Error handling signal:', error);
            setError('Failed to establish connection. Please try again.');
          }
        });
        
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      socket.disconnect();
    };
  }, [socket]);

  // Show role selection if not connected
  if (!role && !isJoining) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold text-gray-200 mb-8">Join Room: {roomId}</h2>
          <div className="space-y-4">
            <button
              onClick={() => joinRoom('host')}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              Join as Host
            </button>
            <button
              onClick={() => joinRoom('member')}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              Join as Member
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state with connection status
  if (isJoining || connectionState === 'connecting') {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-200 mb-2">Joining room...</p>
          <p className="text-gray-400 text-sm">Connection state: {connectionState}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex flex-col">
      {/* Room Info Modal for Host */}
      {showRoomInfo && role === 'host' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background/10 border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Share Room ID</h3>
            <p className="text-gray-400 mb-4">Share this room ID with others to join your meeting:</p>
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex-1 bg-gray-800 rounded-lg p-3">
                <p className="text-gray-200 font-mono">{roomId}</p>
              </div>
              <button
                onClick={copyRoomId}
                className="p-3 bg-background/10 border border-gray-800 rounded-lg hover:bg-background/20 transition-colors"
                aria-label="Copy room ID"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-200" />
                )}
              </button>
            </div>
            <button
              onClick={() => setShowRoomInfo(false)}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Local Video */}
          <div className="relative rounded-lg overflow-hidden bg-background/10 border border-gray-800">
            <video 
              ref={localVideoRef} 
              id="local" 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover" 
            />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-gray-200 text-sm">You ({role})</p>
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative rounded-lg overflow-hidden bg-background/10 border border-gray-800">
            <video 
              ref={remoteVideoRef} 
              id="remote" 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-gray-200 text-sm">
                {participants.find(p => p.id !== socket?.id)?.role || 'Waiting for participant...'}
              </p>
            </div>
          </div>

          {/* Quality Stats Panel */}
          <div className="bg-background/10 border border-gray-800 rounded-lg p-4 text-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-200">Stream Quality</h3>
              {role === 'host' && (
                <button
                  onClick={() => setShowRoomInfo(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Show Room ID
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400">Resolution</p>
                <p className="text-gray-200">{localStats.videoResolution}</p>
              </div>
              <div>
                <p className="text-gray-400">Frame Rate</p>
                <p className="text-gray-200">{localStats.frameRate} fps</p>
              </div>
              <div>
                <p className="text-gray-400">Video Bitrate</p>
                <p className="text-gray-200">{localStats.videoBitrate.toFixed(1)} kbps</p>
              </div>
              <div>
                <p className="text-gray-400">Audio Bitrate</p>
                <p className="text-gray-200">{localStats.audioBitrate.toFixed(1)} kbps</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Audio Level</p>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-200" 
                    style={{ width: `${(localStats.audioLevel / 255) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-background/10 border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={`p-3 rounded-full ${isMicMuted ? 'bg-red-500/20 border border-red-500/20' : 'bg-background/10 border border-gray-800 hover:bg-background/20'} transition-colors`}
              aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMicMuted ? (
                <MicOff className="w-6 h-6 text-red-400" />
              ) : (
                <Mic className="w-6 h-6 text-gray-200" />
              )}
            </button>
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500/20 border border-red-500/20' : 'bg-background/10 border border-gray-800 hover:bg-background/20'} transition-colors`}
              aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-red-400" />
              ) : (
                <Video className="w-6 h-6 text-gray-200" />
              )}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              className="p-3 rounded-full bg-background/10 border border-gray-800 hover:bg-background/20 transition-colors"
              aria-label="Open chat"
            >
              <MessageSquare className="w-6 h-6 text-gray-200" />
            </button>
            <button 
              className="p-3 rounded-full bg-background/10 border border-gray-800 hover:bg-background/20 transition-colors"
              aria-label="Show participants"
            >
              <Users className="w-6 h-6 text-gray-200" />
            </button>
            <button 
              className="p-3 rounded-full bg-background/10 border border-gray-800 hover:bg-background/20 transition-colors"
              aria-label="Open settings"
            >
              <Settings className="w-6 h-6 text-gray-200" />
            </button>
            <button 
              className="p-3 rounded-full bg-background/10 border border-gray-800 hover:bg-background/20 transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-6 h-6 text-gray-200" />
            </button>
          </div>

          <button
            className="p-3 rounded-full bg-red-500/20 border border-red-500/20 hover:bg-red-500/30 transition-colors"
            aria-label="Leave call"
          >
            <PhoneOff className="w-6 h-6 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
