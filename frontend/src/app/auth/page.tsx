'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Phone, Lock, Mail, ArrowRight, CheckCircle } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegisterParam = searchParams.get('mode') === 'register';

  const [isRegister, setIsRegister] = useState(isRegisterParam);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const baseUrl = 'http://localhost:3000/api/v1';

      if (isRegister) {
        // Register API flow
        const registerRes = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, phone }),
        });

        if (!registerRes.ok) {
          const errData = await registerRes.json() as Record<string, unknown>;
          throw new Error(String(errData.message || 'Registration failed.'));
        }

        setSuccess('Registration successful! Requesting phone verification OTP code.');
        // Trigger OTP send automatically
        await sendOtp();
      } else {
        // Login API flow
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!loginRes.ok) {
          const errData = await loginRes.json() as Record<string, unknown>;
          throw new Error(String(errData.message || 'Invalid credentials.'));
        }

        const data = await loginRes.json() as {
          accessToken: string;
          refreshToken: string;
          user: { id: string; email: string; role: string };
        };

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        router.push('/deck');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setError('');
    try {
      const baseUrl = 'http://localhost:3000/api/v1';
      const otpRes = await fetch(`${baseUrl}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!otpRes.ok) {
        const errData = await otpRes.json() as Record<string, unknown>;
        throw new Error(String(errData.message || 'Failed to dispatch verification code.'));
      }

      setOtpSent(true);
      setSuccess('Verification code sent successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch verification code.');
    }
  };

  const verifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const baseUrl = 'http://localhost:3000/api/v1';
      const verifyRes = await fetch(`${baseUrl}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json() as Record<string, unknown>;
        throw new Error(String(errData.message || 'Invalid verification code.'));
      }

      setSuccess('Phone verified successfully! You can now log in.');
      setIsRegister(false);
      setOtpSent(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#09090b] relative min-h-screen">
      {/* Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#ff4b72]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#8b5cf6]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 relative z-10">
        <Heart className="w-8 h-8 text-[#ff4b72] fill-[#ff4b72]" />
        <span className="font-['Outfit'] text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-[#ff4b72] bg-clip-text text-transparent">
          MatchNova
        </span>
      </Link>

      <div className="w-full max-w-md p-8 rounded-3xl glass-panel relative z-10 shadow-2xl border border-white/5">
        <h2 className="font-['Outfit'] text-3xl font-bold mb-2 text-center">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-sm text-zinc-400 text-center mb-8">
          {isRegister
            ? 'Discover relationships backed by vector algorithms.'
            : 'Access your premium compatibility deck.'}
        </p>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {otpSent ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                Enter Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Verification code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff4b72] transition-colors"
                />
              </div>
            </div>

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-[#ff4b72] to-[#8b5cf6] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm"
            >
              Verify Phone Number
            </button>

            <button
              onClick={sendOtp}
              className="w-full py-2 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Resend Code
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4.5 h-4.5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#ff4b72] transition-colors"
                  />
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4.5 h-4.5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="+2348012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#ff4b72] transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4.5 h-4.5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#ff4b72] transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-[#ff4b72] to-[#8b5cf6] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-pink-500/10 cursor-pointer"
            >
              {isRegister ? 'Sign Up' : 'Log In'} <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
            }}
            className="text-xs text-zinc-400 hover:text-[#ff4b72] transition-colors font-medium"
          >
            {isRegister
              ? 'Already have an account? Log In'
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center min-h-screen bg-[#09090b]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Heart className="w-12 h-12 text-[#ff4b72] fill-[#ff4b72]" />
          <span className="text-sm text-zinc-400">Loading Auth...</span>
        </div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
