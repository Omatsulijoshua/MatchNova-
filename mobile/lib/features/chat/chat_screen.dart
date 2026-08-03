import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../auth/auth_provider.dart';
import 'chat_provider.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  MobileMatch? _activeMatch;
  final _msgController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatProvider);
    final chatNotifier = ref.read(chatProvider.notifier);
    final currentUserId = ref.watch(authProvider).userId ?? '';

    // Scroll to bottom when messages list size changes
    ref.listen<ChatState>(chatProvider, (prev, next) {
      if (prev?.messages.length != next.messages.length || next.partnerTyping) {
        _scrollToBottom();
      }
    });

    if (_activeMatch != null) {
      final opponent = _activeMatch!.getOpponent(currentUserId);
      return Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              CircleAvatar(
                backgroundImage: opponent.photo.isNotEmpty ? NetworkImage(opponent.photo) : null,
                radius: 18,
                child: opponent.photo.isEmpty ? const Icon(Icons.person) : null,
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${opponent.firstName} ${opponent.lastName}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  const Row(
                    children: [
                      Icon(Icons.circle, color: Colors.green, size: 8),
                      SizedBox(width: 4),
                      Text('Online', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    ],
                  ),
                ],
              ),
            ],
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              chatNotifier.leaveActiveMatch();
              setState(() {
                _activeMatch = null;
              });
            },
          ),
        ),
        body: Column(
          children: [
            Expanded(
              child: chatState.loadingMessages
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: chatState.messages.length + (chatState.partnerTyping ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == chatState.messages.length) {
                          // Typing indicator
                          return _buildTypingIndicator(opponent);
                        }

                        final msg = chatState.messages[index];
                        final isOwn = msg.senderId == currentUserId;
                        return _buildMessageBubble(msg, isOwn);
                      },
                    ),
            ),

            // Message Send Input Footer
            Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _msgController,
                        onChanged: (text) {
                          chatNotifier.updateTyping(text.trim().isNotEmpty);
                        },
                        decoration: InputDecoration(
                          hintText: 'Type a message...',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () {
                        final text = _msgController.text.trim();
                        if (text.isEmpty) return;
                        chatNotifier.sendMessage(text);
                        _msgController.clear();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                        ),
                        child: const Icon(Icons.send, color: Colors.white, size: 20),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Conversations'),
      ),
      body: chatState.loadingMatches
          ? const Center(child: CircularProgressIndicator())
          : chatState.matches.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.chat_bubble_outline, size: 56, color: Colors.grey[800]),
                      const SizedBox(height: 16),
                      const Text(
                        'No matches found yet.',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: chatState.matches.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final match = chatState.matches[index];
                    final opponent = match.getOpponent(currentUserId);
                    return GestureDetector(
                      onTap: () async {
                        setState(() {
                          _activeMatch = match;
                        });
                        await chatNotifier.selectMatch(match.id);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.border),
                          color: AppColors.surface,
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundImage: opponent.photo.isNotEmpty
                                  ? NetworkImage(opponent.photo)
                                  : null,
                              radius: 24,
                              child: opponent.photo.isEmpty ? const Icon(Icons.person) : null,
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${opponent.firstName} ${opponent.lastName}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Click to start chatting...',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.arrow_forward_ios,
                              size: 14,
                              color: AppColors.textSecondary,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildMessageBubble(MobileMessage msg, bool isOwn) {
    return Align(
      alignment: isOwn ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isOwn ? 16 : 0),
            bottomRight: Radius.circular(isOwn ? 0 : 16),
          ),
          gradient: isOwn
              ? const LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: isOwn ? null : Colors.white12,
          border: isOwn ? null : Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: isOwn ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(
              msg.content,
              style: const TextStyle(fontSize: 14, color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(
              '${msg.createdAt.hour.toString().padLeft(2, '0')}:${msg.createdAt.minute.toString().padLeft(2, '0')}',
              style: TextStyle(fontSize: 9, color: Colors.white.withOpacity(0.5)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingIndicator(ChatUser opponent) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomRight: Radius.circular(16),
          ),
          color: Colors.white.withOpacity(0.05),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white30),
            ),
            const SizedBox(width: 12),
            Text(
              '${opponent.firstName} is typing...',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
