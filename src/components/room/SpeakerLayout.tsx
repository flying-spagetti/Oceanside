'use client'
import React from 'react';
import { VideoTile } from './VideoTile';
import type { StreamData } from '../../lib/types'; // Assuming types will be centralized

type SpeakerLayoutProps = {
  streams: StreamData[];
  mainParticipantId: string | null;
  setMainParticipantId: (id: string) => void;
};

export const SpeakerLayout = ({ streams, mainParticipantId, setMainParticipantId }: SpeakerLayoutProps) => {
  if (streams.length === 0) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-gray-400">Waiting for participants...</p></div>;
  }

  const mainSpeaker = streams.find(p => p.id === mainParticipantId) || streams[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-4 bg-black relative">
        {mainSpeaker && (
          <VideoTile
            stream={mainSpeaker.stream}
            isMuted={mainSpeaker.isMuted}
            isLocal={mainSpeaker.isLocal}
            name={mainSpeaker.isLocal ? `You (${mainSpeaker.role})` : `User ${mainSpeaker.id.substring(0, 6)}`}
          />
        )}
      </div>
      {streams.length > 1 && (
        <div className="bg-black/50 border-t border-gray-800 p-2">
          <div className="flex justify-center gap-4 overflow-x-auto py-2">
            {streams.map(p => (
              <div
                key={p.id}
                className={`w-48 h-28 flex-shrink-0 cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-400 ${mainSpeaker.id === p.id ? 'border-4 border-blue-500 shadow-2xl' : 'border-2 border-gray-700/60'}`}
                onClick={() => setMainParticipantId(p.id)}
              >
                <VideoTile stream={p.stream} isMuted={p.isMuted} isLocal={p.isLocal} name={p.isLocal ? 'You' : `User ${p.id.substring(0, 6)}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
