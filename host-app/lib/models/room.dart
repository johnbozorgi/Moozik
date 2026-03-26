class Room {
  final String id;
  final String code;
  final String hostId;
  final String name;
  final bool isActive;
  final int memberCount;
  final DateTime createdAt;

  Room({
    required this.id,
    required this.code,
    required this.hostId,
    required this.name,
    required this.isActive,
    required this.memberCount,
    required this.createdAt,
  });

  factory Room.fromMap(String id, Map<dynamic, dynamic> map) {
    return Room(
      id: id,
      code: map['code'] ?? '',
      hostId: map['hostId'] ?? '',
      name: map['name'] ?? 'Untitled Room',
      isActive: map['isActive'] ?? true,
      memberCount: map['memberCount'] ?? 0,
      createdAt: map['createdAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'code': code,
      'hostId': hostId,
      'name': name,
      'isActive': isActive,
      'memberCount': memberCount,
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }
}
