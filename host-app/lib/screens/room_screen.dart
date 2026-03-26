import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:audio_service/audio_service.dart';
import '../models/room.dart';
import '../models/track.dart';
import '../services/audio_service.dart';
import '../services/firebase_service.dart';

class RoomScreen extends StatefulWidget {
  final Room room;
  final MoozikAudioHandler audioHandler;

  const RoomScreen({super.key, required this.room, required this.audioHandler});

  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> with SingleTickerProviderStateMixin {
  final FirebaseService _firebase = FirebaseService();
  late TabController _tabController;

  List<Track> _queue = [];
  List<Track> _requests = [];
  Map<String, dynamic> _members = {};
  Track? _nowPlaying;
  bool _isPlaying = false;
  StreamSubscription? _positionSub;
  Duration _position = Duration.zero;

  late StreamSubscription _queueSub;
  late StreamSubscription _requestsSub;
  late StreamSubscription _membersSub;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _subscribeToRoom();
    _positionSub = widget.audioHandler.positionStream.listen((pos) {
      setState(() => _position = pos);
    });
  }

  void _subscribeToRoom() {
    _queueSub = _firebase.watchQueue(widget.room.id).listen((tracks) {
      setState(() {
        _queue = tracks;
        _nowPlaying = tracks.where((t) => t.status == 'playing').firstOrNull;
      });
    });
    _requestsSub = _firebase.watchRequests(widget.room.id).listen((requests) {
      setState(() => _requests = requests);
    });
    _membersSub = _firebase.watchMembers(widget.room.id).listen((members) {
      setState(() => _members = members);
    });
  }

  Future<void> _playTrack(Track track) async {
    final item = MediaItem(
      id: track.videoId,
      title: track.title,
      artist: track.artist,
      artUri: track.thumbnailUrl.isNotEmpty ? Uri.parse(track.thumbnailUrl) : null,
      duration: Duration(seconds: track.durationSeconds),
    );
    await _firebase.setNowPlaying(widget.room.id, track);
    await widget.audioHandler.playVideoId(track.videoId, item);
    setState(() { _nowPlaying = track; _isPlaying = true; });
  }

  Future<void> _togglePlayPause() async {
    if (widget.audioHandler.playing) {
      await widget.audioHandler.pause();
      setState(() => _isPlaying = false);
    } else {
      await widget.audioHandler.play();
      setState(() => _isPlaying = true);
    }
  }

  Future<void> _playNext() async {
    final pending = _queue.where((t) => t.status == 'approved').toList();
    if (pending.isEmpty) return;
    if (_nowPlaying != null) {
      await _firebase.markPlayed(widget.room.id, _nowPlaying!.id);
    }
    await _playTrack(pending.first);
  }

  Future<void> _approveRequest(Track track) async {
    await _firebase.approveRequest(widget.room.id, track);
  }

  Future<void> _rejectRequest(String trackId) async {
    await _firebase.rejectRequest(widget.room.id, trackId);
  }

  Future<void> _removeFromQueue(String trackId) async {
    await _firebase.removeFromQueue(widget.room.id, trackId);
  }

  Future<void> _endRoom() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF18181b),
        title: const Text('End Room', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure? This will end the session for all guests.', style: TextStyle(color: Color(0xFFa1a1aa))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel', style: TextStyle(color: Color(0xFFa1a1aa)))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7f1d1d)),
            child: const Text('End Room', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await widget.audioHandler.stop();
    await _firebase.endRoom(widget.room.id, widget.room.code);
    if (mounted) Navigator.pop(context);
  }

  void _copyCode() {
    Clipboard.setData(ClipboardData(text: widget.room.code));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Room code copied!'), duration: Duration(seconds: 2)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF111113),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.room.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            GestureDetector(
              onTap: _copyCode,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(widget.room.code, style: const TextStyle(color: Color(0xFFa855f7), fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 2)),
                  const SizedBox(width: 4),
                  const Icon(Icons.copy_rounded, size: 12, color: Color(0xFFa855f7)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: _endRoom,
            icon: const Icon(Icons.stop_circle_outlined, color: Color(0xFFf87171), size: 18),
            label: const Text('End', style: TextStyle(color: Color(0xFFf87171), fontSize: 13)),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFa855f7),
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFF71717a),
          tabs: [
            Tab(text: 'Queue (${_queue.where((t) => t.status != 'played').length})'),
            Tab(text: 'Requests (${_requests.length})'),
            Tab(text: 'Members (${_members.length})'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Now Playing bar
          if (_nowPlaying != null) _buildNowPlayingBar(),

          // Tabs
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildQueueTab(),
                _buildRequestsTab(),
                _buildMembersTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNowPlayingBar() {
    final track = _nowPlaying!;
    final duration = Duration(seconds: track.durationSeconds);
    final progress = duration.inSeconds > 0 ? _position.inSeconds / duration.inSeconds : 0.0;

    return Container(
      color: const Color(0xFF18181b),
      child: Column(
        children: [
          LinearProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            backgroundColor: const Color(0xFF27272a),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFa855f7)),
            minHeight: 2,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                if (track.thumbnailUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Image.network(track.thumbnailUrl, width: 44, height: 44, fit: BoxFit.cover),
                  )
                else
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF27272a),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.music_note, color: Color(0xFFa855f7)),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(track.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                          overflow: TextOverflow.ellipsis),
                      Text(track.requestedByName, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(_isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      color: const Color(0xFFa855f7), size: 28),
                  onPressed: _togglePlayPause,
                ),
                IconButton(
                  icon: const Icon(Icons.skip_next_rounded, color: Color(0xFF71717a), size: 24),
                  onPressed: _playNext,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQueueTab() {
    final pending = _queue.where((t) => t.status == 'approved' || t.status == 'playing').toList();
    if (pending.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.queue_music_rounded, size: 48, color: Color(0xFF3f3f46)),
            SizedBox(height: 12),
            Text('Queue is empty', style: TextStyle(color: Color(0xFF71717a))),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: pending.length,
      itemBuilder: (_, i) {
        final track = pending[i];
        final isPlaying = track.status == 'playing';
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: isPlaying ? const Color(0xFF2e1065) : const Color(0xFF18181b),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isPlaying ? const Color(0xFFa855f7) : const Color(0xFF27272a)),
          ),
          child: ListTile(
            leading: track.thumbnailUrl.isNotEmpty
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Image.network(track.thumbnailUrl, width: 44, height: 44, fit: BoxFit.cover),
                  )
                : Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(color: const Color(0xFF27272a), borderRadius: BorderRadius.circular(6)),
                    child: const Icon(Icons.music_note, color: Color(0xFFa855f7)),
                  ),
            title: Text(track.title, style: TextStyle(
                color: isPlaying ? const Color(0xFFa855f7) : Colors.white,
                fontWeight: FontWeight.w600, fontSize: 14),
                overflow: TextOverflow.ellipsis),
            subtitle: Text('${track.requestedByName} · ${track.durationFormatted}',
                style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!isPlaying)
                  IconButton(
                    icon: const Icon(Icons.play_arrow_rounded, color: Color(0xFFa855f7)),
                    onPressed: () => _playTrack(track),
                  ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF71717a)),
                  onPressed: () => _removeFromQueue(track.id),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildRequestsTab() {
    if (_requests.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_rounded, size: 48, color: Color(0xFF3f3f46)),
            SizedBox(height: 12),
            Text('No pending requests', style: TextStyle(color: Color(0xFF71717a))),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _requests.length,
      itemBuilder: (_, i) {
        final track = _requests[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF18181b),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF27272a)),
          ),
          child: Row(
            children: [
              if (track.thumbnailUrl.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Image.network(track.thumbnailUrl, width: 48, height: 48, fit: BoxFit.cover),
                )
              else
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(color: const Color(0xFF27272a), borderRadius: BorderRadius.circular(6)),
                  child: const Icon(Icons.music_note, color: Color(0xFFa855f7)),
                ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(track.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                        overflow: TextOverflow.ellipsis),
                    Text('Requested by ${track.requestedByName}',
                        style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.check_circle_rounded, color: Color(0xFF10b981), size: 28),
                onPressed: () => _approveRequest(track),
              ),
              IconButton(
                icon: const Icon(Icons.cancel_rounded, color: Color(0xFFf87171), size: 28),
                onPressed: () => _rejectRequest(track.id),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMembersTab() {
    if (_members.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline_rounded, size: 48, color: Color(0xFF3f3f46)),
            SizedBox(height: 12),
            Text('No members yet', style: TextStyle(color: Color(0xFF71717a))),
          ],
        ),
      );
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: _members.entries.map((e) {
        final member = e.value as Map;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF18181b),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF27272a)),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundImage: member['photoURL'] != null ? NetworkImage(member['photoURL']) : null,
                backgroundColor: const Color(0xFF27272a),
                child: member['photoURL'] == null
                    ? Text((member['name'] ?? 'G').substring(0, 1).toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 14))
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(member['name'] ?? 'Guest',
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
              ),
              Text(member['role'] ?? 'guest',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            ],
          ),
        );
      }).toList(),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _queueSub.cancel();
    _requestsSub.cancel();
    _membersSub.cancel();
    _positionSub?.cancel();
    super.dispose();
  }
}
