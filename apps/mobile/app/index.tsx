import { Link } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07070a' }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ color: 'white', fontSize: 36, fontWeight: '800' }}>RoomBeat</Text>
        <Text style={{ color: '#a1a1aa', fontSize: 16 }}>
          Create synchronized YouTube music rooms with host-controlled playback.
        </Text>
        <Link href="/room/demo" style={{ color: '#34d399', fontSize: 18, fontWeight: '700' }}>
          Enter demo room
        </Link>
      </View>
    </SafeAreaView>
  );
}
