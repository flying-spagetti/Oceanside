'use client'
import React, { useEffect, useRef } from 'react';
import { MicOff } from 'lucide-react';

// Note: The parent component is responsible for the aspect ratio and size of this tile.
export const VideoTile = React.memo(({ stream, name, isMuted, isLocal }: { stream: MediaStream, name: string, isMuted: boolean, isLocal: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 shadow-lg w-full h-full">
      <video ref={videoRef} autoPlay playsInline muted={isLocal || isMuted} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-semibold drop-shadow-lg truncate">{name}</p>
          {isMuted && <MicOff className="w-5 h-5 text-red-400 bg-black/50 rounded-full p-1 flex-shrink-0" />}
        </div>
      </div>
    </div>
  );
});
