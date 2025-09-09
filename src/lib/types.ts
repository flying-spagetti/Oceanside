export type Participant = {
  id: string;
  role: 'host' | 'member';
  isMuted: boolean;
};

export type StreamData = {
  id: string;
  stream: MediaStream;
  isLocal: boolean;
  role: 'host' | 'member';
  isMuted: boolean;
};

export type RoomState = 'idle' | 'joining' | 'joined' | 'error';
