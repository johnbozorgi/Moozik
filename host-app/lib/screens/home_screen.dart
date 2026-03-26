import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/audio_service.dart';
import '../services/firebase_service.dart';
import '../models/room.dart';
import 'room_screen.dart';

class HomeScreen extends StatefulWidget {
  final MoozikAudioHandler audioHandler;

  const HomeScreen({super.key, required this.audioHandler});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final FirebaseService _firebase = FirebaseService();
  final _nameController = TextEditingController();
  bool _creating = false;
  String? _error;

  User get user => FirebaseAuth.instance.currentUser!;

  Future<void> _createRoom() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Please enter a room name');
      return;
    }
    setState(() { _creating = true; _error = null; });
    try {
      final room = await _firebase.createRoom(user.uid, name);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => RoomScreen(
            room: room,
            audioHandler: widget.audioHandler,
          ),
        ),
      );
      _nameController.clear();
    } catch (e) {
      setState(() => _error = 'Failed to create room: $e');
    } finally {
      setState(() => _creating = false);
    }
  }

  Future<void> _signOut() async {
    await FirebaseAuth.instance.signOut();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF111113),
        title: const Text('Moozik', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFa855f7))),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundImage: user.photoURL != null ? NetworkImage(user.photoURL!) : null,
                  backgroundColor: const Color(0xFF27272a),
                  child: user.photoURL == null
                      ? Text(user.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                          style: const TextStyle(color: Colors.white, fontSize: 13))
                      : null,
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.logout, size: 20, color: Color(0xFF71717a)),
                  onPressed: _signOut,
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Text(
                'Welcome, ${user.displayName?.split(' ').first ?? 'Host'}!',
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                'Create a room and start hosting music',
                style: TextStyle(fontSize: 16, color: Colors.grey[500]),
              ),
              const SizedBox(height: 40),

              // Create room card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF18181b),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF27272a)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.add_circle_outline, color: Color(0xFFa855f7), size: 22),
                        SizedBox(width: 10),
                        Text('Create a Room', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
                      ],
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _nameController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Room name (e.g. Friday Night Mix)',
                        hintStyle: TextStyle(color: Colors.grey[600]),
                        filled: true,
                        fillColor: const Color(0xFF09090b),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF27272a)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF27272a)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFa855f7), width: 2),
                        ),
                      ),
                      onSubmitted: (_) => _createRoom(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: Color(0xFFf87171), fontSize: 13)),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _creating ? null : _createRoom,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFa855f7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: _creating
                            ? const SizedBox(width: 20, height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Create Room', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Info cards
              Row(
                children: [
                  _infoCard(
                    icon: Icons.qr_code_rounded,
                    title: 'Share Code',
                    description: 'Guests join using your 6-character room code',
                  ),
                  const SizedBox(width: 12),
                  _infoCard(
                    icon: Icons.queue_music_rounded,
                    title: 'Control Queue',
                    description: 'Approve or reject song requests from guests',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _infoCard(
                    icon: Icons.headphones_rounded,
                    title: 'Background Play',
                    description: 'Music continues even when app is minimized',
                  ),
                  const SizedBox(width: 12),
                  _infoCard(
                    icon: Icons.people_rounded,
                    title: 'Manage Members',
                    description: 'See who joined and kick if needed',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoCard({required IconData icon, required String title, required String description}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF18181b),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF27272a)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: const Color(0xFFa855f7), size: 22),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 4),
            Text(description, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }
}
