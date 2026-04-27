import { useCallback, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { chooseSyncCorrection, type ServerSyncPayload } from '@roombeat/shared';
import { useRoomSocket } from './useRoomSocket';
import { usePlayerSyncStore } from './playerSyncStore';

export function YouTubeRoomPlayer({ roomId }: { roomId: string }) {
  const playerRef = useRef<YoutubeIframeRef>(null);
  const { socket, clockEstimate } = useRoomSocket(roomId);
  const { currentVideoId, setCurrentVideoId, lastSequence, setLastSequence } = usePlayerSyncStore();

  const applySync = useCallback(
    async (sync: ServerSyncPayload) => {
      if (sync.sequence <= lastSequence) {
        return;
      }

      const currentPositionSec = (await playerRef.current?.getCurrentTime()) ?? 0;
      const correction = chooseSyncCorrection({
        sync,
        currentVideoId,
        currentPositionSec,
        clientNowMs: Date.now(),
        serverOffsetMs: clockEstimate?.serverOffsetMs ?? 0,
      });

      if (correction.action === 'load_video') {
        setCurrentVideoId(sync.videoId);
      }

      if (correction.action !== 'none') {
        await playerRef.current?.seekTo(correction.targetPositionSec, true);
      }

      setLastSequence(sync.sequence);
    },
    [clockEstimate?.serverOffsetMs, currentVideoId, lastSequence, setCurrentVideoId, setLastSequence],
  );

  useEffect(() => {
    socket.on('sync:broadcast', applySync);
    socket.on('sync:force-correction', applySync);

    return () => {
      socket.off('sync:broadcast', applySync);
      socket.off('sync:force-correction', applySync);
    };
  }, [applySync, socket]);

  return (
    <View style={{ gap: 12 }}>
      <YoutubePlayer ref={playerRef} height={220} videoId={currentVideoId ?? 'dQw4w9WgXcQ'} />
      <Text style={{ color: '#a1a1aa' }}>
        Sync offset: {Math.round(clockEstimate?.serverOffsetMs ?? 0)}ms
      </Text>
    </View>
  );
}
