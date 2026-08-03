import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../features/admin/admin_screen.dart';
import '../features/auth/auth_screen.dart';
import '../features/chat/chat_screen.dart';
import '../features/deck/deck_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  redirect: (BuildContext context, GoRouterState state) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    final loggingIn = state.matchedLocation == '/auth';

    if (token == null && !loggingIn) {
      return '/auth';
    }
    if (token != null && loggingIn) {
      return '/deck';
    }
    return null;
  },
  routes: <RouteBase>[
    GoRoute(
      path: '/',
      builder: (BuildContext context, GoRouterState state) {
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      },
      redirect: (BuildContext context, GoRouterState state) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('accessToken');
        if (token != null) {
          return '/deck';
        } else {
          return '/auth';
        }
      },
    ),
    GoRoute(
      path: '/auth',
      builder: (BuildContext context, GoRouterState state) {
        return const AuthScreen();
      },
    ),
    GoRoute(
      path: '/deck',
      builder: (BuildContext context, GoRouterState state) {
        return const DeckScreen();
      },
    ),
    GoRoute(
      path: '/chat',
      builder: (BuildContext context, GoRouterState state) {
        return const ChatScreen();
      },
    ),
    GoRoute(
      path: '/admin',
      builder: (BuildContext context, GoRouterState state) {
        return const AdminScreen();
      },
    ),
  ],
);
