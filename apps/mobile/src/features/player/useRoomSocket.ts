import { useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { estimateClockOffset, smoothClockEstimate, type ClockEstimate } from '@roombeat/shared';
import type { ClientToServerEvents, ServerToClientEvents } from '@roombeat/shared/socket';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export function useRoomSocket(roomId: string) {
  const [clockEstimate, setClockEstimate] = useState<ClockEstimate | null>(null);
  const socket = useMemo(
    () =>
      io(apiUrl, {
        auth: { userId: 'demo-user', displayName: 'Demo Listener' },
      }) as Socket<ServerToClientEvents, ClientToServerEvents>,
    [],
  );

  useEffect(() => {
    socket.emit('room:join', { roomId, userId: 'demo-user' });

    const interval = setInterval(() => {
      socket.emit('latency:ping', { clientSentAtMs: Date.now() });
    }, 5000);

    socket.on('latency:pong', (payload) => {
      const next = estimateClockOffset({
        ...payload,
        clientReceivedAtMs: Date.now(),
      });
      setClockEstimate((previous) => smoothClockEstimate(previous, next));
    });

    return () => {
      clearInterval(interval);
      socket.emit('room:leave', { roomId });
      socket.disconnect();
    };
  }, [roomId, socket]);

  return { socket, clockEstimate };
}
