import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';
import { YouTubeRoomPlayer } from '@/features/player/YouTubeRoomPlayer';

export default function RoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07070a' }}>
      <View style={{ flex: 1, padding: 16, gap: 16 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>Room {roomId}</Text>
        <YouTubeRoomPlayer roomId={roomId ?? 'demo'} />
      </View>
    </SafeAreaView>
  );
}
