'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Sparkles, Shield, Zap, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in, if so redirect to deck
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.push('/deck');
    } else {
      setTimeout(() => setLoading(false), 0);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-[#09090b]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Heart className="w-12 h-12 text-[#ff4b72] fill-[#ff4b72]" />
          <span className="text-sm text-zinc-400">Loading MatchNova...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#09090b]">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#ff4b72]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <Heart className="w-8 h-8 text-[#ff4b72] fill-[#ff4b72]" />
          <span className="font-['Outfit'] text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-[#ff4b72] bg-clip-text text-transparent">
            MatchNova
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth"
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/auth?mode=register"
            className="px-4 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-[#ff4b72] to-[#8b5cf6] hover:brightness-110 transition-all text-white shadow-lg shadow-pink-500/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10 max-w-4xl mx-auto py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-500/20 bg-pink-500/5 text-xs font-semibold text-[#ff4b72] mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Relationship Revolution
        </div>

        <h1 className="font-['Outfit'] text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
          Find Your Perfect{' '}
          <span className="bg-gradient-to-r from-[#ff4b72] via-[#d946ef] to-[#8b5cf6] bg-clip-text text-transparent">
            Nova Match
          </span>
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Move beyond superficial swiping. MatchNova uses advanced vector-embedded questionnaires and cosine matching algorithms to find deep, genuine compatibility.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full max-w-md mx-auto mb-16">
          <Link
            href="/auth?mode=register"
            className="w-full sm:w-auto px-8 py-4 text-base font-bold rounded-full bg-gradient-to-r from-[#ff4b72] to-[#8b5cf6] text-white hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-pink-500/25"
          >
            Create Your Profile <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/auth"
            className="w-full sm:w-auto px-8 py-4 text-base font-bold rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            Log In
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mt-10">
          <div className="p-6 rounded-2xl glass-panel relative group hover:border-pink-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-[#ff4b72] mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-['Outfit'] text-lg font-bold mb-2">Vector Matching Engine</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Deterministic 1536-dimensional interest vectors determine compatibility before you swipe.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel relative group hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-[#8b5cf6] mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-['Outfit'] text-lg font-bold mb-2">Real-Time WebSocket Chat</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Connect instantly with typing indications, dynamic read receipts, and real-time alerts.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel relative group hover:border-emerald-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#10b981] mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-['Outfit'] text-lg font-bold mb-2">Safety & Moderation</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Zero tolerance for spam, immediate account suspensions, and raw webhook signature verification.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between border-t border-white/5 relative z-10 gap-4 mt-20">
        <span className="text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} MatchNova. All rights reserved.
        </span>
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Admin Panel
          </Link>
          <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}
