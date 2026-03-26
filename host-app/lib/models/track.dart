class Track {
  final String id;
  final String videoId;
  final String title;
  final String artist;
  final String thumbnailUrl;
  final int durationSeconds;
  final String requestedBy;
  final String requestedByName;
  final String status; // 'pending' | 'approved' | 'playing' | 'played'
  final DateTime addedAt;

  Track({
    required this.id,
    required this.videoId,
    required this.title,
    required this.artist,
    required this.thumbnailUrl,
    required this.durationSeconds,
    required this.requestedBy,
    required this.requestedByName,
    required this.status,
    required this.addedAt,
  });

  factory Track.fromMap(String id, Map<dynamic, dynamic> map) {
    return Track(
      id: id,
      videoId: map['videoId'] ?? '',
      title: map['title'] ?? 'Unknown Title',
      artist: map['artist'] ?? 'Unknown Artist',
      thumbnailUrl: map['thumbnailUrl'] ?? '',
      durationSeconds: map['durationSeconds'] ?? 0,
      requestedBy: map['requestedBy'] ?? '',
      requestedByName: map['requestedByName'] ?? 'Guest',
      status: map['status'] ?? 'pending',
      addedAt: map['addedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['addedAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'videoId': videoId,
      'title': title,
      'artist': artist,
      'thumbnailUrl': thumbnailUrl,
      'durationSeconds': durationSeconds,
      'requestedBy': requestedBy,
      'requestedByName': requestedByName,
      'status': status,
      'addedAt': addedAt.millisecondsSinceEpoch,
    };
  }

  Track copyWith({String? status}) {
    return Track(
      id: id,
      videoId: videoId,
      title: title,
      artist: artist,
      thumbnailUrl: thumbnailUrl,
      durationSeconds: durationSeconds,
      requestedBy: requestedBy,
      requestedByName: requestedByName,
      status: status ?? this.status,
      addedAt: addedAt,
    );
  }

  String get durationFormatted {
    final m = durationSeconds ~/ 60;
    final s = durationSeconds % 60;
    return '${m}:${s.toString().padLeft(2, '0')}';
  }
}
