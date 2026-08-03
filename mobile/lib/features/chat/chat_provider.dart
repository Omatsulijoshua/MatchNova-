import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';

class ChatUser {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String photo;

  ChatUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.photo,
  });

  factory ChatUser.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'] ?? {};
    final photos = List<String>.from(profile['photos'] ?? []);
    return ChatUser(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      firstName: profile['firstName'] as String? ?? 'Nova',
      lastName: profile['lastName'] as String? ?? 'User',
      photo: photos.isNotEmpty ? photos.first : '',
    );
  }
}

class MobileMatch {
  final String id;
  final String user1Id;
  final String user2Id;
  final ChatUser user1;
  final ChatUser user2;

  MobileMatch({
    required this.id,
    required this.user1Id,
    required this.user2Id,
    required this.user1,
    required this.user2,
  });

  factory MobileMatch.fromJson(Map<String, dynamic> json) {
    return MobileMatch(
      id: json['id'] as String,
      user1Id: json['user1Id'] as String,
      user2Id: json['user2Id'] as String,
      user1: ChatUser.fromJson(json['user1'] as Map<String, dynamic>),
      user2: ChatUser.fromJson(json['user2'] as Map<String, dynamic>),
    );
  }

  ChatUser getOpponent(String currentUserId) {
    return user1Id == currentUserId ? user2 : user1;
  }
}

class MobileMessage {
  final String id;
  final String matchId;
  final String senderId;
  final String content;
  final DateTime createdAt;

  MobileMessage({
    required this.id,
    required this.matchId,
    required this.senderId,
    required this.content,
    required this.createdAt,
  });

  factory MobileMessage.fromJson(Map<String, dynamic> json) {
    return MobileMessage(
      id: json['id'] as String,
      matchId: json['matchId'] as String,
      senderId: json['senderId'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class ChatState {
  final List<MobileMatch> matches;
  final List<MobileMessage> messages;
  final bool loadingMatches;
  final bool loadingMessages;
  final bool partnerTyping;

  ChatState({
    required this.matches,
    required this.messages,
    required this.loadingMatches,
    required this.loadingMessages,
    required this.partnerTyping,
  });

  factory ChatState.initial() => ChatState(
        matches: [],
        messages: [],
        loadingMatches: true,
        loadingMessages: false,
        partnerTyping: false,
      );

  ChatState copyWith({
    List<MobileMatch>? matches,
    List<MobileMessage>? messages,
    bool? loadingMatches,
    bool? loadingMessages,
    bool? partnerTyping,
  }) =>
      ChatState(
        matches: matches ?? this.matches,
        messages: messages ?? this.messages,
        loadingMatches: loadingMatches ?? this.loadingMatches,
        loadingMessages: loadingMessages ?? this.loadingMessages,
        partnerTyping: partnerTyping ?? this.partnerTyping,
      );
}

class ChatNotifier extends StateNotifier<ChatState> {
  final Dio _dio;
  final SocketClient _socketClient;
  String? _activeMatchId;

  ChatNotifier(this._dio, this._socketClient) : super(ChatState.initial()) {
    fetchMatches();
  }

  Future<void> fetchMatches() async {
    state = state.copyWith(loadingMatches: true);
    try {
      final response = await _dio.get('/swipes/matches');
      final list = (response.data as List)
          .map((json) => MobileMatch.fromJson(json as Map<String, dynamic>))
          .toList();
      state = state.copyWith(matches: list, loadingMatches: false);
    } catch (e) {
      state = state.copyWith(loadingMatches: false);
    }
  }

  Future<void> selectMatch(String matchId) async {
    _activeMatchId = matchId;
    state = state.copyWith(loadingMessages: true, messages: [], partnerTyping: false);

    // Fetch message logs history
    try {
      final response = await _dio.get('/chat/history/$matchId');
      final list = (response.data as List)
          .map((json) => MobileMessage.fromJson(json as Map<String, dynamic>))
          .toList();
      state = state.copyWith(messages: list, loadingMessages: false);
    } catch (e) {
      state = state.copyWith(loadingMessages: false);
    }

    // Connect and join WebSocket room
    await _socketClient.connect();
    final socket = _socketClient.socket;

    socket?.emit('join_room', {'matchId': matchId});

    // Message handler hook
    socket?.off('message');
    socket?.on('message', (data) {
      final msg = MobileMessage.fromJson(data as Map<String, dynamic>);
      if (msg.matchId == _activeMatchId) {
        state = state.copyWith(
          messages: [...state.messages, msg],
        );
      }
    });

    // Typing handler hook
    socket?.off('typing');
    socket?.on('typing', (data) {
      final typingData = data as Map<String, dynamic>;
      if (typingData['matchId'] == _activeMatchId) {
        state = state.copyWith(partnerTyping: typingData['typing'] as bool);
      }
    });
  }

  void sendMessage(String content) {
    if (_activeMatchId == null) return;
    final socket = _socketClient.socket;

    socket?.emit('send_message', {
      'matchId': _activeMatchId,
      'content': content,
    });

    // Stop typing state
    socket?.emit('typing', {
      'matchId': _activeMatchId,
      'typing': false,
    });
  }

  void updateTyping(bool typing) {
    if (_activeMatchId == null) return;
    _socketClient.socket?.emit('typing', {
      'matchId': _activeMatchId,
      'typing': typing,
    });
  }

  void leaveActiveMatch() {
    _activeMatchId = null;
    _socketClient.disconnect();
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  final dio = ref.watch(dioProvider);
  final socket = ref.watch(socketClientProvider);
  return ChatNotifier(dio, socket);
});
