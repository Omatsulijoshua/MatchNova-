import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';

class MobileProfile {
  final String id;
  final String name;
  final String bio;
  final String gender;
  final int age;
  final double? distance;
  final double? compatibility;
  final List<String> photos;
  final List<String> interests;

  MobileProfile({
    required this.id,
    required this.name,
    required this.bio,
    required this.gender,
    required this.age,
    this.distance,
    this.compatibility,
    required this.photos,
    required this.interests,
  });

  factory MobileProfile.fromJson(Map<String, dynamic> json) {
    return MobileProfile(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Nova User',
      bio: json['bio'] as String? ?? 'No bio provided.',
      gender: json['gender'] as String? ?? 'Other',
      age: json['age'] as int? ?? 21,
      distance: (json['distance'] as num?)?.toDouble(),
      compatibility: (json['compatibility'] as num?)?.toDouble(),
      photos: List<String>.from(json['photos'] ?? []),
      interests: List<String>.from(json['interests'] ?? []),
    );
  }
}

class DeckState {
  final List<MobileProfile> profiles;
  final int currentIndex;
  final bool loading;
  final String? error;
  final MobileProfile? matchedProfile;

  DeckState({
    required this.profiles,
    required this.currentIndex,
    required this.loading,
    this.error,
    this.matchedProfile,
  });

  factory DeckState.initial() => DeckState(
        profiles: [],
        currentIndex: 0,
        loading: true,
      );

  DeckState copyWith({
    List<MobileProfile>? profiles,
    int? currentIndex,
    bool? loading,
    String? error,
    MobileProfile? matchedProfile,
    bool clearMatch = false,
  }) =>
      DeckState(
        profiles: profiles ?? this.profiles,
        currentIndex: currentIndex ?? this.currentIndex,
        loading: loading ?? this.loading,
        error: error,
        matchedProfile: clearMatch ? null : (matchedProfile ?? this.matchedProfile),
      );
}

class DeckNotifier extends StateNotifier<DeckState> {
  final Dio _dio;

  DeckNotifier(this._dio) : super(DeckState.initial()) {
    fetchRecommendations();
  }

  Future<void> fetchRecommendations() async {
    state = state.copyWith(loading: true);
    try {
      final response = await _dio.get('/swipes/recommendations');
      final list = (response.data as List)
          .map((json) => MobileProfile.fromJson(json as Map<String, dynamic>))
          .toList();

      state = state.copyWith(
        profiles: list,
        currentIndex: 0,
        loading: false,
      );
    } on DioException catch (e) {
      state = state.copyWith(
        loading: false,
        error: e.response?.data?['message'] ?? 'Failed to load recommendation deck.',
      );
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: 'Failed to retrieve deck.',
      );
    }
  }

  Future<bool> swipe(String action) async {
    if (state.currentIndex >= state.profiles.length) return false;
    final currentProfile = state.profiles[state.currentIndex];

    // optimistic index increment
    final nextIndex = state.currentIndex + 1;
    state = state.copyWith(currentIndex: nextIndex);

    try {
      final response = await _dio.post('/swipes', data: {
        'targetUserId': currentProfile.id,
        'action': action,
      });

      if (response.data['match'] == true) {
        state = state.copyWith(matchedProfile: currentProfile);
        return true;
      }
    } catch (e) {
      // Swipe failure log
    }
    return false;
  }

  void clearMatch() {
    state = state.copyWith(clearMatch: true);
  }
}

final deckProvider = StateNotifierProvider<DeckNotifier, DeckState>((ref) {
  final dio = ref.watch(dioProvider);
  return DeckNotifier(dio);
});
