import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'http://localhost:3000/api/v1',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        // Simple token refresh placeholder logic
        if (error.response?.statusCode == 401) {
          final prefs = await SharedPreferences.getInstance();
          final refreshToken = prefs.getString('refreshToken');
          if (refreshToken != null) {
            try {
              final response = await Dio().post(
                'http://localhost:3000/api/v1/auth/refresh',
                data: {'refreshToken': refreshToken},
              );
              final newAccess = response.data['accessToken'];
              final newRefresh = response.data['refreshToken'];

              await prefs.setString('accessToken', newAccess);
              await prefs.setString('refreshToken', newRefresh);

              // Retry original request
              final options = error.requestOptions;
              options.headers['Authorization'] = 'Bearer $newAccess';
              final cloneReq = await dio.fetch(options);
              return handler.resolve(cloneReq);
            } catch (e) {
              await prefs.clear();
            }
          }
        }
        return handler.next(error);
      },
    ),
  );

  return dio;
});
