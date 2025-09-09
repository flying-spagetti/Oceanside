'use client'
import React from 'react';
import { X, MicOff } from 'lucide-react';

// Define types right in the component file for simplicity
type Participant = {
  id: string;
  role: 'host' | 'member';
  isMuted: boolean;
};

type ParticipantsPanelProps = {
  participants: Participant[];
  socketId: string | undefined;
  onClose: () => void;
};

export const ParticipantsPanel = ({ participants, socketId, onClose }: ParticipantsPanelProps) => {
  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-gray-900/90 backdrop-blur-sm border-l border-gray-800 z-20 p-4 animate-slide-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Participants ({participants.length})</h3>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="space-y-3 overflow-y-auto h-[calc(100%-4rem)]">
        {participants.map(p => (
          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800">
            <p className="text-gray-300 truncate">{p.id === socketId ? 'You' : `User-${p.id.substring(0, 6)}`}</p>
            <div className="flex items-center space-x-2">
              {p.isMuted && <MicOff className="w-4 h-4 text-red-400" />}
              <p className="text-gray-400 text-sm capitalize flex-shrink-0 ml-2">{p.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
