'use client'
import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Users, LayoutGrid, Copy, Check } from 'lucide-react';

type ControlsProps = {
  roomId: string;
  isMicMuted: boolean;
  isVideoOff: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleLayout: () => void;
  onShowParticipants: () => void;
  onLeave: () => void;
};

export const Controls = ({
  roomId,
  isMicMuted,
  isVideoOff,
  onToggleMic,
  onToggleVideo,
  onToggleLayout,
  onShowParticipants,
  onLeave,
}: ControlsProps) => {
  const [copied, setCopied] = React.useState(false);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy room ID:', error);
    }
  };

  return (
    <div className="bg-black/50 border-t border-gray-800 p-4 z-10">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left: Room Info */}
        <div className="flex items-center space-x-2">
          <button onClick={copyRoomId} className="p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2">
            <span className='text-gray-300 font-mono text-sm'>{roomId}</span>
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        {/* Center: Core Controls */}
        <div className="flex items-center space-x-4">
          <button onClick={onToggleMic} className={`p-3 rounded-full ${isMicMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-800'} border border-gray-700 hover:bg-gray-700 transition-colors`} aria-label={isMicMuted ? "Unmute" : "Mute"}>
            {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button onClick={onToggleVideo} className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-gray-800'} border border-gray-700 hover:bg-gray-700 transition-colors`} aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}>
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
          <button onClick={onLeave} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors mx-4" aria-label="Leave call">
            <PhoneOff className="w-6 h-6" />
          </button>
          <button onClick={onToggleLayout} className="p-3 rounded-full bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors" aria-label="Change layout">
            <LayoutGrid className="w-6 h-6" />
          </button>
          <button onClick={onShowParticipants} className="p-3 rounded-full bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors" aria-label="Show participants">
            <Users className="w-6 h-6" />
          </button>
        </div>

        {/* Right: Settings */}
        <div>
          <button className="p-3 rounded-full bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors" aria-label="Open settings">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
