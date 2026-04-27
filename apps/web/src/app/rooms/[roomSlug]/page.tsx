import type { Metadata } from 'next';

type RoomPageProps = {
  params: Promise<{ roomSlug: string }>;
};

async function getRoomMetadata(roomSlug: string) {
  return {
    slug: roomSlug,
    title: roomSlug === 'demo' ? 'Demo Listening Room' : `Room ${roomSlug}`,
    hostName: 'RoomBeat Host',
    currentTrackTitle: 'Synchronized YouTube session',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    activeUserCount: 1,
  };
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { roomSlug } = await params;
  const room = await getRoomMetadata(roomSlug);

  return {
    title: `${room.title} | RoomBeat`,
    description: `Join ${room.hostName}'s live room. Now playing: ${room.currentTrackTitle}.`,
    openGraph: {
      title: `${room.title} | RoomBeat`,
      description: `${room.activeUserCount} listeners live. Now playing: ${room.currentTrackTitle}.`,
      images: [{ url: room.thumbnailUrl, width: 480, height: 360 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${room.title} | RoomBeat`,
      description: `Now playing: ${room.currentTrackTitle}.`,
      images: [room.thumbnailUrl],
    },
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomSlug } = await params;
  const room = await getRoomMetadata(roomSlug);

  return (
    <main style={{ minHeight: '100vh', padding: 32 }}>
      <p style={{ color: '#34d399', fontWeight: 700 }}>Live room</p>
      <h1>{room.title}</h1>
      <p style={{ color: '#a1a1aa', maxWidth: 640 }}>
        Hosted by {room.hostName}. Now playing {room.currentTrackTitle}.
      </p>
      <img
        src={room.thumbnailUrl}
        alt=""
        style={{ width: 'min(480px, 100%)', borderRadius: 8, marginTop: 24 }}
      />
    </main>
  );
}
