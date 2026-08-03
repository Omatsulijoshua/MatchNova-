import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import 'auth_provider.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();

  bool _isRegister = false;
  bool _otpSent = false;
  bool _isLoading = false;
  String? _errorMsg;
  String? _successMsg;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMsg = null;
      _successMsg = null;
    });

    final authNotifier = ref.read(authProvider.notifier);

    if (_isRegister) {
      final success = await authNotifier.register(
        _emailController.text.trim(),
        _passwordController.text,
        _phoneController.text.trim(),
      );

      if (success) {
        setState(() {
          _successMsg = 'Account created. Dispatching phone verification code.';
        });
        await _sendOtpCode();
      }
    } else {
      final success = await authNotifier.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (success && mounted) {
        context.go('/deck');
      }
    }

    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _sendOtpCode() async {
    final success = await ref
        .read(authProvider.notifier)
        .sendOtp(_phoneController.text.trim());

    if (success) {
      setState(() {
        _otpSent = true;
        _successMsg = 'OTP verification code dispatched via mock SMS service.';
      });
    } else {
      setState(() {
        _errorMsg = 'Failed to dispatch verification code.';
      });
    }
  }

  Future<void> _verifyOtpCode() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    final success = await ref.read(authProvider.notifier).verifyOtp(
          _phoneController.text.trim(),
          _otpController.text.trim(),
        );

    setState(() {
      _isLoading = false;
    });

    if (success) {
      setState(() {
        _otpSent = false;
        _isRegister = false; // toggle back to login
        _successMsg = 'Phone verified successfully! You can now log in.';
      });
    } else {
      setState(() {
        _errorMsg = 'Invalid verification code.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Watch AuthState errors
    ref.listen<AuthState>(authProvider, (_, state) {
      if (state.status == AuthStatus.error) {
        setState(() {
          _errorMsg = state.errorMessage;
        });
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Icon
                  const Icon(
                    Icons.favorite,
                    color: AppColors.primary,
                    size: 64,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'MatchNova',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isRegister
                        ? 'Discover relationships backed by vector algorithms.'
                        : 'Access your premium compatibility deck.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 32),

                  if (_errorMsg != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.redAccent.withOpacity(0.2)),
                      ),
                      child: Text(
                        _errorMsg!,
                        style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (_successMsg != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.green.withOpacity(0.2)),
                      ),
                      child: Text(
                        _successMsg!,
                        style: const TextStyle(color: Colors.green, fontSize: 13),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (_otpSent) ...[
                    TextFormField(
                      controller: _otpController,
                      decoration: const InputDecoration(
                        hintText: 'Enter Verification Code',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
                      keyboardType: TextInputType.number,
                      validator: (value) =>
                          value == null || value.isEmpty ? 'OTP required' : null,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _verifyOtpCode,
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Verify Phone Number'),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: _isLoading ? null : _sendOtpCode,
                      child: const Text('Resend Code'),
                    ),
                  ] else ...[
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        hintText: 'Email Address',
                        prefixIcon: Icon(Icons.mail_outline),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) =>
                          value == null || !value.contains('@') ? 'Invalid email' : null,
                    ),
                    const SizedBox(height: 16),
                    if (_isRegister) ...[
                      TextFormField(
                        controller: _phoneController,
                        decoration: const InputDecoration(
                          hintText: 'Phone Number (e.g. +23480...)',
                          prefixIcon: Icon(Icons.phone_outlined),
                        ),
                        keyboardType: TextInputType.phone,
                        validator: (value) =>
                            value == null || value.isEmpty ? 'Phone number required' : null,
                      ),
                      const SizedBox(height: 16),
                    ],
                    TextFormField(
                      controller: _passwordController,
                      decoration: const InputDecoration(
                        hintText: 'Password',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
                      obscureText: true,
                      validator: (value) =>
                          value == null || value.length < 6 ? 'Too short' : null,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _submit,
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(_isRegister ? 'Sign Up' : 'Log In'),
                    ),
                    const SizedBox(height: 24),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _isRegister = !_isRegister;
                          _errorMsg = null;
                          _successMsg = null;
                        });
                      },
                      child: Text(
                        _isRegister
                            ? 'Already have an account? Log In'
                            : "Don't have an account? Sign Up",
                        style: const TextStyle(color: AppColors.primary),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
