import { create } from 'zustand';

type PlayerSyncState = {
  currentVideoId: string | null;
  lastSequence: number;
  setCurrentVideoId: (videoId: string) => void;
  setLastSequence: (sequence: number) => void;
};

export const usePlayerSyncStore = create<PlayerSyncState>((set) => ({
  currentVideoId: null,
  lastSequence: 0,
  setCurrentVideoId: (currentVideoId) => set({ currentVideoId }),
  setLastSequence: (lastSequence) => set({ lastSequence }),
}));
