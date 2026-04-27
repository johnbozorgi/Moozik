# RoomBeat Sync Protocol

## Authority Model

The host is the playback controller, but server time is authoritative. A host emits observations such as play, pause, seek, track changes, and periodic heartbeat sync. The API stamps each observation with `serverTimestampMs` and a monotonic `sequence` before broadcasting.

## Joiner Target Calculation

Joiners estimate server clock offset with ping/pong:

1. Client sends `latency:ping` with `clientSentAtMs`.
2. Server replies with `serverReceivedAtMs` and `serverSentAtMs`.
3. Client records `clientReceivedAtMs`.
4. Client estimates round trip and server offset.

When a sync payload arrives:

```txt
estimatedServerNowMs = clientNowMs + serverOffsetMs
elapsedMs = estimatedServerNowMs - sync.serverTimestampMs
targetPositionSec = sync.positionSec + elapsedMs / 1000 * playbackRate
```

If the room is paused, joiners seek to `positionSec` and pause. If the video ID changed, joiners load the video first, then seek and apply the status.

## Correction Thresholds

- Under 250ms drift: no correction.
- 250ms to 1000ms drift: soft seek or temporary playback-rate nudge.
- Over 1000ms drift: hard seek.
- Host seek or track change: hard correction regardless of threshold.

## Edge Cases

- New joiner: server sends `room:state` containing latest sync, queue, and active user count.
- Host pause: server stores exact pause position and broadcasts it.
- Host resume: server stamps a fresh resume timestamp.
- Host seek: server increments sequence and broadcasts a forced correction.
- Host disconnect: room enters a short reconnect grace window before optional co-host promotion.
- Out-of-order packets: clients ignore payloads with a sequence older than the last applied sequence.
