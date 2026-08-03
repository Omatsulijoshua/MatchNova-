import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class SocketClient {
  io.Socket? _socket;

  io.Socket? get socket => _socket;

  Future<void> connect() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');

    if (token == null) return;

    _socket = io.io(
      'http://localhost:3000',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': 'Bearer $token'})
          .enableForceNew()
          .build(),
    );

    _socket?.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}

final socketClientProvider = Provider<SocketClient>((ref) {
  final client = SocketClient();
  ref.onDispose(() {
    client.disconnect();
  });
  return client;
});
