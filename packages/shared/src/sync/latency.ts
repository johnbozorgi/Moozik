export type ClockEstimate = {
  roundTripMs: number;
  serverOffsetMs: number;
};

export function estimateClockOffset(input: {
  clientSentAtMs: number;
  clientReceivedAtMs: number;
  serverReceivedAtMs: number;
  serverSentAtMs: number;
}): ClockEstimate {
  const roundTripMs =
    input.clientReceivedAtMs - input.clientSentAtMs - (input.serverSentAtMs - input.serverReceivedAtMs);

  const serverMidpointMs = (input.serverReceivedAtMs + input.serverSentAtMs) / 2;
  const clientMidpointMs = (input.clientSentAtMs + input.clientReceivedAtMs) / 2;

  return {
    roundTripMs: Math.max(0, roundTripMs),
    serverOffsetMs: serverMidpointMs - clientMidpointMs,
  };
}

export function smoothClockEstimate(
  previous: ClockEstimate | null,
  next: ClockEstimate,
  alpha = 0.2,
): ClockEstimate {
  if (!previous) {
    return next;
  }

  return {
    roundTripMs: previous.roundTripMs * (1 - alpha) + next.roundTripMs * alpha,
    serverOffsetMs: previous.serverOffsetMs * (1 - alpha) + next.serverOffsetMs * alpha,
  };
}
