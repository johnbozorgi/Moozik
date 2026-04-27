import type { ServerSyncPayload } from '../socket/schemas.js';

export type SyncCorrection =
  | { action: 'none'; targetPositionSec: number; driftSec: number }
  | { action: 'soft_seek'; targetPositionSec: number; driftSec: number }
  | { action: 'hard_seek'; targetPositionSec: number; driftSec: number }
  | { action: 'pause'; targetPositionSec: number; driftSec: number }
  | { action: 'load_video'; targetPositionSec: number; driftSec: number };

export function calculateTargetPositionSec(input: {
  sync: ServerSyncPayload;
  clientNowMs: number;
  serverOffsetMs: number;
}): number {
  if (input.sync.status !== 'playing') {
    return input.sync.positionSec;
  }

  const estimatedServerNowMs = input.clientNowMs + input.serverOffsetMs;
  const elapsedMs = Math.max(0, estimatedServerNowMs - input.sync.serverTimestampMs);

  return input.sync.positionSec + (elapsedMs / 1000) * input.sync.playbackRate;
}

export function chooseSyncCorrection(input: {
  sync: ServerSyncPayload;
  currentVideoId: string | null;
  currentPositionSec: number;
  clientNowMs: number;
  serverOffsetMs: number;
  softThresholdSec?: number;
  hardThresholdSec?: number;
}): SyncCorrection {
  const targetPositionSec = calculateTargetPositionSec(input);
  const driftSec = targetPositionSec - input.currentPositionSec;

  if (input.currentVideoId !== input.sync.videoId) {
    return { action: 'load_video', targetPositionSec, driftSec };
  }

  if (input.sync.status === 'paused') {
    return { action: 'pause', targetPositionSec, driftSec };
  }

  const absDriftSec = Math.abs(driftSec);
  const softThresholdSec = input.softThresholdSec ?? 0.25;
  const hardThresholdSec = input.hardThresholdSec ?? 1;

  if (absDriftSec < softThresholdSec) {
    return { action: 'none', targetPositionSec, driftSec };
  }

  if (absDriftSec < hardThresholdSec) {
    return { action: 'soft_seek', targetPositionSec, driftSec };
  }

  return { action: 'hard_seek', targetPositionSec, driftSec };
}
