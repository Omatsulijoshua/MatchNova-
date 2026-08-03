import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api_client.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final String? userId;
  final String? email;
  final String? role;
  final String? errorMessage;

  AuthState({
    required this.status,
    this.userId,
    this.email,
    this.role,
    this.errorMessage,
  });

  factory AuthState.initial() => AuthState(status: AuthStatus.initial);
  factory AuthState.loading() => AuthState(status: AuthStatus.loading);
  factory AuthState.authenticated({
    required String userId,
    required String email,
    required String role,
  }) =>
      AuthState(
        status: AuthStatus.authenticated,
        userId: userId,
        email: email,
        role: role,
      );
  factory AuthState.unauthenticated() =>
      AuthState(status: AuthStatus.unauthenticated);
  factory AuthState.error(String message) =>
      AuthState(status: AuthStatus.error, errorMessage: message);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Dio _dio;

  AuthNotifier(this._dio) : super(AuthState.initial()) {
    checkAuth();
  }

  Future<void> checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    final userId = prefs.getString('userId');
    final email = prefs.getString('email');
    final role = prefs.getString('role');

    if (token != null && userId != null && email != null && role != null) {
      state = AuthState.authenticated(
        userId: userId,
        email: email,
        role: role,
      );
    } else {
      state = AuthState.unauthenticated();
    }
  }

  Future<bool> login(String email, String password) async {
    state = AuthState.loading();
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      final data = response.data;
      final prefs = await SharedPreferences.getInstance();

      await prefs.setString('accessToken', data['accessToken']);
      await prefs.setString('refreshToken', data['refreshToken']);
      await prefs.setString('userId', data['user']['id']);
      await prefs.setString('email', data['user']['email']);
      await prefs.setString('role', data['user']['role']);

      state = AuthState.authenticated(
        userId: data['user']['id'],
        email: data['user']['email'],
        role: data['user']['role'],
      );
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to log in.';
      state = AuthState.error(msg.toString());
      return false;
    } catch (e) {
      state = AuthState.error('An unexpected error occurred.');
      return false;
    }
  }

  Future<bool> register(String email, String password, String phone) async {
    state = AuthState.loading();
    try {
      await _dio.post('/auth/register', data: {
        'email': email,
        'password': password,
        'phone': phone,
      });
      state = AuthState.unauthenticated();
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to register account.';
      state = AuthState.error(msg.toString());
      return false;
    }
  }

  Future<bool> sendOtp(String phone) async {
    try {
      await _dio.post('/auth/otp/send', data: {'phone': phone});
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> verifyOtp(String phone, String code) async {
    try {
      await _dio.post('/auth/otp/verify', data: {
        'phone': phone,
        'code': code,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    state = AuthState.unauthenticated();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final dio = ref.watch(dioProvider);
  return AuthNotifier(dio);
});
