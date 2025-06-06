"use client"
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import useSocket from '@/components/hooks/useSocket';

const ICE_SERVERS = {
  iceServers: [
    {
      urls: 'stun:openrelay.metered.ca:80',
    }
  ],
};

const Room = ({ params }: { params: { id: string } }) => {
  useSocket();
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  const router = useRouter();
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerVideoRef = useRef<HTMLVideoElement | null>(null);
  const rtcConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const userStreamRef = useRef<MediaStream | null>(null);
  const hostRef = useRef(false);

  const roomName = params.id;

  const handleRoomJoined = () => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 500, height: 500 },
      })
      .then((stream) => {
        userStreamRef.current = stream;
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
          userVideoRef.current.onloadedmetadata = () => {
            userVideoRef.current?.play();
          };
        }
        socketRef.current?.emit('ready', roomName);
      })
      .catch((err) => {
        console.log('error', err);
      });
  };

  const handleRoomCreated = () => {
    hostRef.current = true;
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 500, height: 500 },
      })
      .then((stream) => {
        userStreamRef.current = stream;
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
          userVideoRef.current.onloadedmetadata = () => {
            userVideoRef.current?.play();
          };
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const initiateCall = () => {
    if (hostRef.current) {
      rtcConnectionRef.current = createPeerConnection();
      if (userStreamRef.current) {
        rtcConnectionRef.current.addTrack(
          userStreamRef.current.getTracks()[0],
          userStreamRef.current,
        );
        rtcConnectionRef.current.addTrack(
          userStreamRef.current.getTracks()[1],
          userStreamRef.current,
        );
      }
      rtcConnectionRef.current
        .createOffer()
        .then((offer) => {
          rtcConnectionRef.current?.setLocalDescription(offer);
          socketRef.current?.emit('offer', offer, roomName);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const handleReceivedOffer = (offer: RTCSessionDescriptionInit) => {
    if (!hostRef.current) {
      rtcConnectionRef.current = createPeerConnection();
      if (userStreamRef.current) {
        rtcConnectionRef.current.addTrack(
          userStreamRef.current.getTracks()[0],
          userStreamRef.current,
        );
        rtcConnectionRef.current.addTrack(
          userStreamRef.current.getTracks()[1],
          userStreamRef.current,
        );
      }
      rtcConnectionRef.current.setRemoteDescription(offer);

      rtcConnectionRef.current
        .createAnswer()
        .then((answer) => {
          rtcConnectionRef.current?.setLocalDescription(answer);
          socketRef.current?.emit('answer', answer, roomName);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const handleAnswer = (answer: RTCSessionDescriptionInit) => {
    rtcConnectionRef.current
      ?.setRemoteDescription(answer)
      .catch((err) => console.log(err));
  };

  const handlerNewIceCandidateMsg = (incoming: RTCIceCandidateInit) => {
    const candidate = new RTCIceCandidate(incoming);
    rtcConnectionRef.current
      ?.addIceCandidate(candidate)
      .catch((e) => console.log(e));
  };

  const createPeerConnection = () => {
    const connection = new RTCPeerConnection(ICE_SERVERS);
    connection.onicecandidate = handleICECandidateEvent;
    connection.ontrack = handleTrackEvent;

    // Create data channel if host
    if (hostRef.current) {
      const channel = connection.createDataChannel("chat");
      setDataChannel(channel);
      setupDataChannel(channel);
    } else {
      connection.ondatachannel = (event) => {
        const channel = event.channel;
        setDataChannel(channel);
        setupDataChannel(channel);
      };
    }

    return connection;
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      console.log("Data channel is open");
    };

    channel.onmessage = (event) => {
      console.log("Received message:", event.data);
      // Handle incoming data
    };

    channel.onclose = () => {
      console.log("Data channel is closed");
    };
  };

  const sendMessage = (message: string) => {
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(message);
    }
  };

  const handleICECandidateEvent = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      socketRef.current?.emit('ice-candidate', event.candidate, roomName);
    }
  };

  const handleTrackEvent = (event: RTCTrackEvent) => {
    if (peerVideoRef.current) {
      peerVideoRef.current.srcObject = event.streams[0];
    }
  };

  useEffect(() => {
    socketRef.current = io();
    // First we join a room
    socketRef.current.emit('join', roomName);

    socketRef.current.on('joined', handleRoomJoined);
    socketRef.current.on('created', handleRoomCreated);
    socketRef.current.on('ready', initiateCall);
    socketRef.current.on('leave', onPeerLeave);
    socketRef.current.on('full', () => {
      window.location.href = '/';
    });
    socketRef.current.on('offer', handleReceivedOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handlerNewIceCandidateMsg);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomName]);

  const onPeerLeave = () => {
    hostRef.current = true;
    if (peerVideoRef.current?.srcObject instanceof MediaStream) {
      peerVideoRef.current.srcObject
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
    }

    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = null;
    }
  };

  const leaveRoom = () => {
    socketRef.current?.emit('leave', roomName);

    if (userVideoRef.current?.srcObject instanceof MediaStream) {
      userVideoRef.current.srcObject.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
    if (peerVideoRef.current?.srcObject instanceof MediaStream) {
      peerVideoRef.current.srcObject
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
    }

    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = null;
    }
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Your Video</h2>
          <video
            ref={userVideoRef}
            autoPlay
            playsInline
            muted
            className="w-[500px] h-[500px] bg-black rounded-lg"
          />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Peer Video</h2>
          <video
            ref={peerVideoRef}
            autoPlay
            playsInline
            className="w-[500px] h-[500px] bg-black rounded-lg"
          />
        </div>
      </div>
      <div className="mt-4 space-x-4">
        <button
          onClick={() => {
            if (userStreamRef.current) {
              const audioTrack = userStreamRef.current.getAudioTracks()[0];
              audioTrack.enabled = !audioTrack.enabled;
              setMicActive(audioTrack.enabled);
            }
          }}
          className={`px-4 py-2 rounded-md ${
            micActive ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {micActive ? 'Mute Mic' : 'Unmute Mic'}
        </button>
        <button
          onClick={() => {
            if (userStreamRef.current) {
              const videoTrack = userStreamRef.current.getVideoTracks()[0];
              videoTrack.enabled = !videoTrack.enabled;
              setCameraActive(videoTrack.enabled);
            }
          }}
          className={`px-4 py-2 rounded-md ${
            cameraActive ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {cameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
        </button>
        <button
          onClick={leaveRoom}
          className="px-4 py-2 rounded-md bg-red-500 text-white"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
};

export default Room;