'use client'
import React from 'react';
import { VideoTile } from './VideoTile';
import type { StreamData } from '../../lib/types';

type GalleryLayoutProps = {
  streams: StreamData[];
};

export const GalleryLayout = ({ streams }: GalleryLayoutProps) => {
  const count = streams.length;

  if (count === 0) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-gray-400">Waiting for participants...</p></div>;
  }

  // Special layout for 3 participants
  if (count === 3) {
    return (
      <div className="flex-1 flex flex-col gap-4 p-4 max-w-7xl w-full mx-auto overflow-hidden">
        <div className="flex-1 rounded-xl overflow-hidden min-h-0">
          <VideoTile {...streams[0]} name={streams[0].isLocal ? 'You' : `User ${streams[0].id.substring(0,6)}`} />
        </div>
        <div className="flex-1 flex gap-4 min-h-0">
          <div className="flex-1 rounded-xl overflow-hidden"><VideoTile {...streams[1]} name={streams[1].isLocal ? 'You' : `User ${streams[1].id.substring(0,6)}`} /></div>
          <div className="flex-1 rounded-xl overflow-hidden"><VideoTile {...streams[2]} name={streams[2].isLocal ? 'You' : `User ${streams[2].id.substring(0,6)}`} /></div>
        </div>
      </div>
    );
  }

  // Special layout for 5 participants
  if (count === 5) {
    return (
      <div className="flex-1 flex flex-col gap-4 p-4 max-w-7xl w-full mx-auto overflow-hidden">
        <div className="flex-1 flex gap-4 min-h-0">
          {streams.slice(0, 2).map(p => (
            <div className="flex-1 rounded-xl overflow-hidden" key={p.id}><VideoTile {...p} name={p.isLocal ? 'You' : `User ${p.id.substring(0,6)}`} /></div>
          ))}
        </div>
        <div className="flex-1 flex gap-4 min-h-0">
          {streams.slice(2, 5).map(p => (
            <div className="flex-1 rounded-xl overflow-hidden" key={p.id}><VideoTile {...p} name={p.isLocal ? 'You' : `User ${p.id.substring(0,6)}`} /></div>
          ))}
        </div>
      </div>
    );
  }

  // Default dynamic grid for other counts
  const getGridClasses = (count: number): string => {
    const baseClasses = "grid gap-4 mx-auto w-full h-full";
    if (count <= 1) return `${baseClasses} grid-cols-1 max-w-4xl`;
    if (count <= 2) return `${baseClasses} grid-cols-1 sm:grid-cols-2 max-w-7xl`;
    if (count <= 4) return `${baseClasses} grid-cols-2 max-w-7xl`;
    if (count <= 6) return `${baseClasses} grid-cols-2 md:grid-cols-3 max-w-7xl`;
    if (count <= 9) return `${baseClasses} grid-cols-3 max-w-7xl`;
    return `${baseClasses} grid-cols-3 md:grid-cols-4 max-w-7xl`;
  };

  return (
    <div className="flex-1 p-4 overflow-hidden flex items-center">
      <div className={getGridClasses(count)}>
        {streams.map(p => (
          <div key={p.id} className="rounded-xl overflow-hidden min-h-0">
            <VideoTile {...p} name={p.isLocal ? `You (${p.role})` : `User ${p.id.substring(0, 6)}`} />
          </div>
        ))}
      </div>
    </div>
  );
};
