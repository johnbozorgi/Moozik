import 'dart:math';
import 'package:firebase_database/firebase_database.dart';
import '../models/room.dart';
import '../models/track.dart';

class FirebaseService {
  final FirebaseDatabase _db = FirebaseDatabase.instance;

  // Generate a unique 6-character room code
  String _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final rand = Random.secure();
    return List.generate(6, (_) => chars[rand.nextInt(chars.length)]).join();
  }

  // Create a new room
  Future<Room> createRoom(String hostId, String roomName) async {
    final code = _generateCode();
    final roomRef = _db.ref('rooms').push();
    final roomId = roomRef.key!;

    final roomData = {
      'code': code,
      'hostId': hostId,
      'name': roomName,
      'isActive': true,
      'memberCount': 0,
      'createdAt': ServerValue.timestamp,
    };

    await Future.wait([
      roomRef.set(roomData),
      _db.ref('roomCodes/$code').set(roomId),
    ]);

    return Room(
      id: roomId,
      code: code,
      hostId: hostId,
      name: roomName,
      isActive: true,
      memberCount: 0,
      createdAt: DateTime.now(),
    );
  }

  // Listen to room queue
  Stream<List<Track>> watchQueue(String roomId) {
    return _db
        .ref('rooms/$roomId/queue')
        .orderByChild('addedAt')
        .onValue
        .map((event) {
      final data = event.snapshot.value as Map<dynamic, dynamic>?;
      if (data == null) return [];
      return data.entries
          .map((e) => Track.fromMap(e.key as String, e.value as Map))
          .toList()
        ..sort((a, b) => a.addedAt.compareTo(b.addedAt));
    });
  }

  // Listen to join requests
  Stream<List<Track>> watchRequests(String roomId) {
    return _db
        .ref('rooms/$roomId/requests')
        .orderByChild('addedAt')
        .onValue
        .map((event) {
      final data = event.snapshot.value as Map<dynamic, dynamic>?;
      if (data == null) return [];
      return data.entries
          .map((e) => Track.fromMap(e.key as String, e.value as Map))
          .toList()
        ..sort((a, b) => a.addedAt.compareTo(b.addedAt));
    });
  }

  // Listen to members
  Stream<Map<String, dynamic>> watchMembers(String roomId) {
    return _db.ref('rooms/$roomId/members').onValue.map((event) {
      final data = event.snapshot.value as Map<dynamic, dynamic>?;
      if (data == null) return {};
      return Map<String, dynamic>.from(data);
    });
  }

  // Approve a request (move from requests to queue)
  Future<void> approveRequest(String roomId, Track track) async {
    final approved = track.copyWith(status: 'approved');
    await Future.wait([
      _db.ref('rooms/$roomId/queue/${track.id}').set(approved.toMap()),
      _db.ref('rooms/$roomId/requests/${track.id}').remove(),
    ]);
  }

  // Reject a request
  Future<void> rejectRequest(String roomId, String trackId) async {
    await _db.ref('rooms/$roomId/requests/$trackId').remove();
  }

  // Remove track from queue
  Future<void> removeFromQueue(String roomId, String trackId) async {
    await _db.ref('rooms/$roomId/queue/$trackId').remove();
  }

  // Update now playing
  Future<void> setNowPlaying(String roomId, Track? track) async {
    if (track == null) {
      await _db.ref('rooms/$roomId/nowPlaying').remove();
    } else {
      await _db.ref('rooms/$roomId/nowPlaying').set({
        ...track.toMap(),
        'startedAt': ServerValue.timestamp,
      });
      await _db.ref('rooms/$roomId/queue/${track.id}').update({'status': 'playing'});
    }
  }

  // Mark track as played
  Future<void> markPlayed(String roomId, String trackId) async {
    await _db.ref('rooms/$roomId/queue/$trackId').update({'status': 'played'});
  }

  // End room
  Future<void> endRoom(String roomId, String code) async {
    await Future.wait([
      _db.ref('rooms/$roomId').update({'isActive': false}),
      _db.ref('roomCodes/$code').remove(),
    ]);
  }

  // Listen to room info
  Stream<Room?> watchRoom(String roomId) {
    return _db.ref('rooms/$roomId').onValue.map((event) {
      final data = event.snapshot.value as Map<dynamic, dynamic>?;
      if (data == null) return null;
      return Room.fromMap(roomId, data);
    });
  }
}
