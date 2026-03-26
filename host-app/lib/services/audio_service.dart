import 'package:audio_service/audio_service.dart';
import 'package:just_audio/just_audio.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';

class MoozikAudioHandler extends BaseAudioHandler with QueueHandler, SeekHandler {
  final AudioPlayer _player = AudioPlayer();
  final YoutubeExplode _yt = YoutubeExplode();

  MoozikAudioHandler() {
    _player.playbackEventStream.listen(_broadcastState);
    _player.processingStateStream.listen((state) {
      if (state == ProcessingState.completed) {
        skipToNext();
      }
    });
  }

  void _broadcastState(PlaybackEvent event) {
    final playing = _player.playing;
    playbackState.add(playbackState.value.copyWith(
      controls: [
        MediaControl.skipToPrevious,
        if (playing) MediaControl.pause else MediaControl.play,
        MediaControl.stop,
        MediaControl.skipToNext,
      ],
      systemActions: const {
        MediaAction.seek,
        MediaAction.seekForward,
        MediaAction.seekBackward,
      },
      androidCompactActionIndices: const [0, 1, 3],
      processingState: const {
        ProcessingState.idle: AudioProcessingState.idle,
        ProcessingState.loading: AudioProcessingState.loading,
        ProcessingState.buffering: AudioProcessingState.buffering,
        ProcessingState.ready: AudioProcessingState.ready,
        ProcessingState.completed: AudioProcessingState.completed,
      }[_player.processingState]!,
      playing: playing,
      updatePosition: _player.position,
      bufferedPosition: _player.bufferedPosition,
      speed: _player.speed,
      queueIndex: event.currentIndex,
    ));
  }

  Future<String?> _getAudioUrl(String videoId) async {
    try {
      final manifest = await _yt.videos.streamsClient.getManifest(videoId);
      final audioStreams = manifest.audioOnly.sortByBitrate();
      return audioStreams.isNotEmpty ? audioStreams.last.url.toString() : null;
    } catch (e) {
      return null;
    }
  }

  Future<void> playVideoId(String videoId, MediaItem item) async {
    mediaItem.add(item);
    final url = await _getAudioUrl(videoId);
    if (url == null) return;
    await _player.setAudioSource(AudioSource.uri(Uri.parse(url)));
    await _player.play();
  }

  @override
  Future<void> play() => _player.play();

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> stop() async {
    await _player.stop();
    await super.stop();
  }

  @override
  Future<void> seek(Duration position) => _player.seek(position);

  @override
  Future<void> skipToNext() async {
    final queue = this.queue.value;
    final index = playbackState.value.queueIndex ?? 0;
    if (index + 1 < queue.length) {
      await skipToQueueItem(index + 1);
    }
  }

  @override
  Future<void> skipToPrevious() async {
    final index = playbackState.value.queueIndex ?? 0;
    if (index > 0) {
      await skipToQueueItem(index - 1);
    }
  }

  Duration get position => _player.position;
  Duration get bufferedPosition => _player.bufferedPosition;
  Stream<Duration> get positionStream => _player.positionStream;
  bool get playing => _player.playing;

  void dispose() {
    _player.dispose();
    _yt.close();
  }
}

Future<MoozikAudioHandler> initAudioService() async {
  return await AudioService.init(
    builder: () => MoozikAudioHandler(),
    config: const AudioServiceConfig(
      androidNotificationChannelId: 'com.moozik.host.audio',
      androidNotificationChannelName: 'Moozik Audio',
      androidNotificationOngoing: true,
      androidStopForegroundOnPause: true,
    ),
  );
}
