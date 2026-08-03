import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../auth/auth_provider.dart';
import 'deck_provider.dart';

class DeckScreen extends ConsumerStatefulWidget {
  const DeckScreen({super.key});

  @override
  ConsumerState<DeckScreen> createState() => _DeckScreenState();
}

class _DeckScreenState extends ConsumerState<DeckScreen> {
  int _currentPhotoIndex = 0;

  @override
  Widget build(BuildContext context) {
    final deckState = ref.watch(deckProvider);
    final deckNotifier = ref.read(deckProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('MatchNova'),
        leading: IconButton(
          icon: const Icon(Icons.logout, color: AppColors.textSecondary),
          onPressed: () async {
            await ref.read(authProvider.notifier).logout();
            if (context.mounted) {
              context.go('/auth');
            }
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.shield_outlined, color: AppColors.secondary),
            onPressed: () => context.push('/admin'),
          ),
          IconButton(
            icon: const Icon(Icons.message_outlined, color: AppColors.primary),
            onPressed: () => context.push('/chat'),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Background Gradient Glow
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withOpacity(0.05),
              ),
            ),
          ),
          Positioned(
            bottom: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.secondary.withOpacity(0.05),
              ),
            ),
          ),

          // Main Candidate Swiper Stack
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: deckState.loading
                ? const Center(child: CircularProgressIndicator())
                : deckState.error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(deckState.error!, textAlign: TextAlign.center),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: deckNotifier.fetchRecommendations,
                              child: const Text('Try Again'),
                            ),
                          ],
                        ),
                      )
                    : deckState.currentIndex >= deckState.profiles.length
                        ? Center(
                            child: Card(
                              color: AppColors.surface,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(30),
                                side: const BorderSide(color: AppColors.border),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 40.0),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.explore_outlined,
                                      size: 56,
                                      color: AppColors.primary,
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      'No Candidates Left',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      'Try expanding your filters or swipe deck criteria settings.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                    const SizedBox(height: 24),
                                    ElevatedButton(
                                      onPressed: deckNotifier.fetchRecommendations,
                                      child: const Text('Refresh Deck'),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )
                        : _buildDeckCard(deckState.profiles[deckState.currentIndex], deckNotifier),
          ),

          // Match Success Overlay Dialog
          if (deckState.matchedProfile != null)
            _buildMatchOverlay(deckState.matchedProfile!, deckNotifier),
        ],
      ),
    );
  }

  Widget _buildDeckCard(MobileProfile profile, DeckNotifier deckNotifier) {
    final hasPhotos = profile.photos.isNotEmpty;
    final activePhoto = hasPhotos ? profile.photos[_currentPhotoIndex] : '';

    return Column(
      children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: AppColors.border),
              image: hasPhotos
                  ? DecorationImage(
                      image: NetworkImage(activePhoto),
                      fit: BoxFit.cover,
                    )
                  : null,
              color: Colors.grey[900],
            ),
            child: Stack(
              children: [
                // Top Dark Overlay
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.black54, Colors.transparent],
                      begin: Alignment.topCenter,
                      end: Alignment.center,
                    ),
                  ),
                ),
                // Bottom Gradient Overlay
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.transparent, Colors.black87],
                      begin: Alignment.center,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),

                // Photo Carousel Indicators
                if (profile.photos.length > 1)
                  Positioned(
                    top: 16,
                    left: 16,
                    right: 16,
                    child: Row(
                      children: List.generate(
                        profile.photos.length,
                        (index) => Expanded(
                          child: Container(
                            height: 3,
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            decoration: BoxDecoration(
                              color: index == _currentPhotoIndex ? Colors.white : Colors.white24,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                // Photo Carousel Tap Spots (Left/Right)
                if (profile.photos.length > 1)
                  Positioned.fill(
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _currentPhotoIndex = _currentPhotoIndex > 0
                                    ? _currentPhotoIndex - 1
                                    : profile.photos.length - 1;
                              });
                            },
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _currentPhotoIndex = _currentPhotoIndex < profile.photos.length - 1
                                    ? _currentPhotoIndex + 1
                                    : 0;
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  ),

                // Profile Details Panel
                Positioned(
                  bottom: 24,
                  left: 20,
                  right: 20,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              '${profile.name}, ${profile.age}',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          if (profile.compatibility != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                color: Colors.green.withOpacity(0.2),
                                border: Border.all(color: Colors.green.withOpacity(0.3)),
                              ),
                              child: Text(
                                '${(profile.compatibility! * 100).round()}% Match',
                                style: const TextStyle(
                                  color: Colors.greenAccent,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (profile.distance != null)
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, color: Colors.grey, size: 14),
                            const SizedBox(width: 4),
                            Text(
                              '${profile.distance!.toStringAsFixed(1)} km away',
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                      const SizedBox(height: 12),
                      Text(
                        profile.bio,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      const SizedBox(height: 16),
                      // Interests Tags
                      if (profile.interests.isNotEmpty)
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: profile.interests
                              .take(3)
                              .map(
                                (tag) => Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white12,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                                  ),
                                  child: Text(
                                    tag.toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Swiping Actions Bar
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            GestureDetector(
              onTap: () {
                deckNotifier.swipe('DISLIKE');
                setState(() {
                  _currentPhotoIndex = 0;
                });
              },
              child: Container(
                width: 60,
                height: 60,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surface,
                ),
                child: const Icon(Icons.close, color: Colors.redAccent, size: 28),
              ),
            ),
            GestureDetector(
              onTap: () {
                deckNotifier.swipe('SUPERLIKE');
                setState(() {
                  _currentPhotoIndex = 0;
                });
              },
              child: Container(
                width: 50,
                height: 50,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surface,
                ),
                child: const Icon(Icons.star, color: Colors.purpleAccent, size: 22),
              ),
            ),
            GestureDetector(
              onTap: () {
                deckNotifier.swipe('LIKE');
                setState(() {
                  _currentPhotoIndex = 0;
                });
              },
              child: Container(
                width: 60,
                height: 60,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary,
                ),
                child: const Icon(Icons.favorite, color: Colors.white, size: 28),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMatchOverlay(MobileProfile profile, DeckNotifier deckNotifier) {
    return Positioned.fill(
      child: Container(
        color: Colors.black.withOpacity(0.9),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.favorite, color: AppColors.primary, size: 72),
            const SizedBox(height: 24),
            const Text(
              "It's a Match!",
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                letterSpacing: -1,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You and ${profile.name} liked each other.',
              style: const TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 48),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40.0),
              child: Column(
                children: [
                  ElevatedButton(
                    onPressed: () {
                      deckNotifier.clearMatch();
                      context.push('/chat');
                    },
                    child: const Text('Send Message'),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: deckNotifier.clearMatch,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white10,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Keep Swiping'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
