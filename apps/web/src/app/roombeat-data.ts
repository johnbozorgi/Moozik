export type Accent = {
  name: string;
  primary: string;
  soft: string;
  rgb: string;
};

export type RoomCard = {
  slug: string;
  title: string;
  host: string;
  currentTrack: string;
  thumbnailUrl: string;
  listeners: number;
  beatRate: number;
  mood: string;
  accent: Accent;
};

export type QueueTrack = {
  title: string;
  requester: string;
  avatar: string;
  votes: number;
  downvotes: number;
  duration: string;
};

export const moods = ['Driving', 'Gym', 'Study', 'Party', 'Chilling'];

export const featuredChannels: RoomCard[] = [
  {
    slug: 'top-50-global',
    title: 'Top 50 Global',
    host: 'RoomBeat Radio',
    currentTrack: 'Global chart pulse',
    thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    listeners: 18420,
    beatRate: 98,
    mood: 'Party',
    accent: { name: 'solar pop', primary: '#f59e0b', soft: '#fef3c7', rgb: '245, 158, 11' },
  },
  {
    slug: 'deep-focus',
    title: 'Deep Focus',
    host: 'RoomBeat Studio',
    currentTrack: 'Lo-fi midnight study set',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault_live.jpg',
    listeners: 7260,
    beatRate: 87,
    mood: 'Study',
    accent: { name: 'violet haze', primary: '#a78bfa', soft: '#ede9fe', rgb: '167, 139, 250' },
  },
  {
    slug: 'persian-hip-hop',
    title: 'Persian Hip-Hop',
    host: 'Tehran Frequency',
    currentTrack: 'New wave street cuts',
    thumbnailUrl: 'https://i.ytimg.com/vi/7QU1nvuxaMA/hqdefault.jpg',
    listeners: 3184,
    beatRate: 91,
    mood: 'Driving',
    accent: { name: 'neon rose', primary: '#fb7185', soft: '#ffe4e6', rgb: '251, 113, 133' },
  },
];

export const trendingRooms: RoomCard[] = [
  {
    slug: 'demo',
    title: 'After Hours Drive',
    host: 'Mina',
    currentTrack: 'Night city synth run',
    thumbnailUrl: 'https://i.ytimg.com/vi/MV_3Dpw-BRY/hqdefault.jpg',
    listeners: 642,
    beatRate: 94,
    mood: 'Driving',
    accent: { name: 'cyan velocity', primary: '#22d3ee', soft: '#cffafe', rgb: '34, 211, 238' },
  },
  {
    slug: 'gym-heat',
    title: 'Gym Heat',
    host: 'Arman',
    currentTrack: 'Peak set rotation',
    thumbnailUrl: 'https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg',
    listeners: 811,
    beatRate: 96,
    mood: 'Gym',
    accent: { name: 'charged lime', primary: '#84cc16', soft: '#ecfccb', rgb: '132, 204, 22' },
  },
  {
    slug: 'slow-sunday',
    title: 'Slow Sunday',
    host: 'Nora',
    currentTrack: 'Warm acoustic queue',
    thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    listeners: 294,
    beatRate: 79,
    mood: 'Chilling',
    accent: { name: 'amber vinyl', primary: '#f97316', soft: '#ffedd5', rgb: '249, 115, 22' },
  },
  {
    slug: 'late-night-code',
    title: 'Late Night Code',
    host: 'Sahar',
    currentTrack: 'Ambient build flow',
    thumbnailUrl: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
    listeners: 487,
    beatRate: 83,
    mood: 'Study',
    accent: { name: 'blue glass', primary: '#60a5fa', soft: '#dbeafe', rgb: '96, 165, 250' },
  },
];

export const friendActivity = [
  { name: 'Layla', room: 'After Hours Drive', avatar: 'L', pulse: 'joining in 2m' },
  { name: 'Omid', room: 'Persian Hip-Hop', avatar: 'O', pulse: 'sent 12 reactions' },
  { name: 'Sara', room: 'Deep Focus', avatar: 'S', pulse: 'hosting' },
];

export const queueTracks: QueueTrack[] = [
  {
    title: 'Purple sky interlude',
    requester: 'Layla',
    avatar: 'L',
    votes: 38,
    downvotes: 2,
    duration: '3:42',
  },
  {
    title: 'Night road anthem',
    requester: 'Omid',
    avatar: 'O',
    votes: 29,
    downvotes: 4,
    duration: '4:08',
  },
  {
    title: 'Velvet bassline',
    requester: 'Sara',
    avatar: 'S',
    votes: 21,
    downvotes: 1,
    duration: '2:57',
  },
];

export const lyricLines = [
  { time: '0:42', text: 'City lights keep counting us in' },
  { time: '0:57', text: 'Every heartbeat lands on the kick' },
  { time: '1:12', text: 'We move together, never alone' },
  { time: '1:28', text: 'Turn the room into radio' },
  { time: '1:44', text: 'One more chorus, one more glow' },
];

export function getRoomBySlug(slug: string): RoomCard {
  const fallbackRoom = trendingRooms[0] ?? featuredChannels[0];

  if (!fallbackRoom) {
    throw new Error('RoomBeat requires at least one room seed.');
  }

  return (
    [...featuredChannels, ...trendingRooms].find((room) => room.slug === slug) ?? {
      ...fallbackRoom,
      slug,
      title: slug
        .split('-')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' '),
    }
  );
}
