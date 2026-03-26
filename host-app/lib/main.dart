import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'services/audio_service.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'firebase_options.dart';

late MoozikAudioHandler audioHandler;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  audioHandler = await initAudioService();
  runApp(const MoozikApp());
}

class MoozikApp extends StatelessWidget {
  const MoozikApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Moozik Host',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFa855f7),
          secondary: Color(0xFF7c3aed),
          surface: Color(0xFF18181b),
          background: Color(0xFF09090b),
        ),
        scaffoldBackgroundColor: const Color(0xFF09090b),
        useMaterial3: true,
        fontFamily: 'SF Pro Display',
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: Color(0xFFa855f7)),
            ),
          );
        }
        if (snapshot.hasData) {
          return HomeScreen(audioHandler: audioHandler);
        }
        return const LoginScreen();
      },
    );
  }
}
