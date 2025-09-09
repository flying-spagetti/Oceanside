'use client'
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoom } from '../../components/hooks/useRoom';
import { Controls } from '../../components/room/Controls';
import { GalleryLayout } from '../../components/room/GalleryLayout';
import { SpeakerLayout } from '../../components/room/SpeakerLayout';
import { ParticipantsPanel } from '../../components/room/ParticipantsPanel';
import type { StreamData } from '../../lib/types';

const RoomPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || 'test-room';

  const {
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
  } = useRoom(roomId);

  const [layoutMode, setLayoutMode] = useState<'gallery' | 'speaker'>('gallery');
  const [mainParticipantId, setMainParticipantId] = useState<string | null>(null);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);

  useEffect(() => {
      if (roomState === 'joined' && participants.length > 0 && !mainParticipantId) {
          const host = participants.find(p => p.role === 'host');
          setMainParticipantId(host ? host.id : participants[0].id);
      }
  }, [roomState, participants, mainParticipantId]);


  const allStreams: StreamData[] = useMemo(() => {
    if (!socket) return [];
    return (localStream ? [{
        id: socket.id,
        stream: localStream,
        isLocal: true,
        role: participants.find(p => p.id === socket.id)?.role || 'member',
        isMuted: isMicMuted
    }] : []).concat(
        Array.from(remoteStreams.entries()).map(([id, stream]) => {
            const participant = participants.find(p => p.id === id);
            return {
                id,
                stream,
                isLocal: false,
                role: participant?.role || 'member',
                isMuted: participant?.isMuted ?? false
            };
        })
    );
  }, [localStream, remoteStreams, participants, socket, isMicMuted]);

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

  if (roomState === 'joining' || !localStream) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-gray-200 ml-4">Joining room...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex flex-col text-white relative">
      {layoutMode === 'gallery' ? (
        <GalleryLayout streams={allStreams} />
      ) : (
        <SpeakerLayout streams={allStreams} mainParticipantId={mainParticipantId} setMainParticipantId={setMainParticipantId} />
      )}

      {showParticipantsPanel && (
        <ParticipantsPanel
          participants={participants}
          socketId={socket?.id}
          onClose={() => setShowParticipantsPanel(false)}
        />
      )}

      <Controls
        roomId={roomId}
        isMicMuted={isMicMuted}
        isVideoOff={isVideoOff}
        onToggleMic={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleLayout={() => setLayoutMode(prev => prev === 'gallery' ? 'speaker' : 'gallery')}
        onShowParticipants={() => setShowParticipantsPanel(true)}
        onLeave={leaveRoom}
      />
    </div>
  );
};

const RoomPage = () => (
  <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
    <RoomPageContent />
  </Suspense>
);

export default RoomPage;