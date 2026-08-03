/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  X,
  Star,
  MessageSquare,
  Sparkles,
  LogOut,
  MapPin,
  Compass,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Profile {
  id: string;
  name: string;
  bio: string;
  gender: string;
  age: number;
  latitude: number;
  longitude: number;
  photos: string[];
  interests: string[];
  compatibility?: number;
  distance?: number;
}

export default function DeckPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecommendations = useCallback(async (authToken: string) => {
    setTimeout(() => {
      setLoading(true);
      setError('');
    }, 0);
    try {
      const baseUrl = 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/swipes/recommendations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          router.push('/auth');
          return;
        }
        throw new Error('Failed to load match candidates deck.');
      }

      const data = await response.json() as Profile[];
      setProfiles(data);
      setCurrentIndex(0);
      setCurrentPhotoIndex(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching recommendations.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (!storedToken) {
      router.push('/auth');
      return;
    }
    fetchRecommendations(storedToken);
  }, [router, fetchRecommendations]);

  const handleSwipe = async (action: 'LIKE' | 'DISLIKE' | 'SUPERLIKE') => {
    if (currentIndex >= profiles.length || swipeDirection) return;

    const currentProfile = profiles[currentIndex];
    const direction = action === 'LIKE' ? 'right' : action === 'DISLIKE' ? 'left' : 'up';
    setSwipeDirection(direction);

    // Delay to let animation run
    setTimeout(async () => {
      try {
        const storedToken = localStorage.getItem('accessToken') || '';
        const baseUrl = 'http://localhost:3000/api/v1';
        const response = await fetch(`${baseUrl}/swipes`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetUserId: currentProfile.id,
            action,
          }),
        });

        if (response.ok) {
          const resBody = await response.json() as { match?: boolean; matchId?: string };
          if (resBody.match) {
            setMatchedProfile(currentProfile);
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#ff4b72', '#8b5cf6', '#ffd700'],
            });
          }
        }
      } catch (err) {
        console.error('Error posting swipe event:', err);
      }

      setProfiles((prev) => prev.filter((_, i) => i !== currentIndex));
      setCurrentPhotoIndex(0);
      setSwipeDirection(null);
    }, 280);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/auth');
  };

  const handleRefreshDeck = () => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      fetchRecommendations(storedToken);
    } else {
      router.push('/auth');
    }
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#09090b] relative">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-[#ff4b72]/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-[#8b5cf6]/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-white/5 relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-[#ff4b72] fill-[#ff4b72]" />
          <span className="font-['Outfit'] text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-[#ff4b72] bg-clip-text text-transparent">
            MatchNova
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-zinc-300 hover:text-white"
          >
            <MessageSquare className="w-5 h-5" />
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 text-xs font-semibold rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            Moderation Panel
          </Link>
          <button
            onClick={handleLogout}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-zinc-300 hover:text-white cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full relative z-10">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#ff4b72]"></div>
            <span className="text-sm text-zinc-400">Finding matches nearby...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={handleRefreshDeck}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center gap-6 glass-panel p-8 rounded-3xl w-full border border-white/5">
            <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center text-[#ff4b72]">
              <Compass className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="font-['Outfit'] text-lg font-bold mb-2">No Candidates Left</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-[240px] mx-auto">
                Try expanding your search criteria or swipe recommendations range in settings.
              </p>
            </div>
            <button
              onClick={handleRefreshDeck}
              className="mt-2 px-6 py-3 rounded-full text-xs font-semibold bg-gradient-to-r from-[#ff4b72] to-[#8b5cf6] text-white hover:brightness-110 shadow-lg shadow-pink-500/10"
            >
              Refresh Deck
            </button>
          </div>
        ) : (
          <div className="w-full relative flex flex-col items-center">
            {/* Card Deck Wrapper */}
            <div className="w-full aspect-[3/4.2] rounded-[30px] overflow-hidden relative shadow-2xl border border-white/10 select-none swipe-card bg-zinc-900/40">
              {/* Photo Carousel */}
              <div className="absolute inset-0 z-0">
                {currentProfile.photos && currentProfile.photos.length > 0 ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={currentProfile.photos[currentPhotoIndex] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600'}
                    alt={currentProfile.name}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#121118] to-[#1a1924] flex items-center justify-center">
                    <Heart className="w-12 h-12 text-zinc-800" />
                  </div>
                )}
                {/* Photo Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />
              </div>

              {/* Photo Carousel indicators */}
              {currentProfile.photos && currentProfile.photos.length > 1 && (
                <div className="absolute top-4 left-0 right-0 flex gap-1.5 px-4 z-10">
                  {currentProfile.photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPhotoIndex(i)}
                      className={`flex-1 h-1 rounded-full transition-all ${
                        i === currentPhotoIndex ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Left/Right Carousel tap spots */}
              {currentProfile.photos && currentProfile.photos.length > 1 && (
                <div className="absolute inset-x-0 top-10 bottom-32 z-10 flex">
                  <div
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev > 0 ? prev - 1 : currentProfile.photos.length - 1,
                      )
                    }
                    className="flex-1 cursor-left"
                  />
                  <div
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev < currentProfile.photos.length - 1 ? prev + 1 : 0,
                      )
                    }
                    className="flex-1 cursor-right"
                  />
                </div>
              )}

              {/* Card Profile Details */}
              <div className="absolute bottom-0 inset-x-0 p-6 z-20 flex flex-col justify-end text-left select-text">
                <div className="flex items-end justify-between gap-4 mb-2">
                  <h2 className="font-['Outfit'] text-2xl font-bold leading-tight">
                    {currentProfile.name}, <span className="font-normal text-zinc-300">{currentProfile.age}</span>
                  </h2>
                  {currentProfile.compatibility && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 backdrop-blur-md">
                      <Sparkles className="w-3.5 h-3.5" />
                      {Math.round(currentProfile.compatibility * 100)}% Match
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4 font-semibold">
                  {currentProfile.distance !== undefined && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {currentProfile.distance.toFixed(1)} km away
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed mb-6 line-clamp-3 select-text">
                  {currentProfile.bio || 'No bio provided.'}
                </p>

                {/* Interests tags */}
                {currentProfile.interests && currentProfile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-[64px]">
                    {currentProfile.interests.slice(0, 4).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/5 bg-white/5 text-zinc-300 uppercase tracking-wider backdrop-blur-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Swipe Action Buttons */}
            <div className="flex items-center justify-between w-full max-w-[280px] mt-8 z-20">
              <button
                onClick={() => handleSwipe('DISLIKE')}
                className="w-14 h-14 rounded-full bg-[#121118] border border-white/5 text-red-500 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer shadow-lg"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                onClick={() => handleSwipe('SUPERLIKE')}
                className="w-12 h-12 rounded-full bg-[#121118] border border-white/5 text-purple-400 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer shadow-lg"
              >
                <Star className="w-5 h-5 fill-purple-400/10 stroke-[2.5]" />
              </button>

              <button
                onClick={() => handleSwipe('LIKE')}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#ff4b72] to-[#ff6b8b] text-white hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer shadow-lg shadow-pink-500/20"
              >
                <Heart className="w-6 h-6 fill-white stroke-none" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Match Overlay */}
      {matchedProfile && (
        <div className="fixed inset-0 z-50 bg-[#09090b]/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="absolute top-[-20%] w-[500px] h-[500px] bg-gradient-to-tr from-[#ff4b72]/15 to-[#8b5cf6]/15 rounded-full blur-[120px]" />

          <Heart className="w-16 h-16 text-[#ff4b72] fill-[#ff4b72] animate-bounce mb-6" />

          <h1 className="font-['Outfit'] text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
            It&apos;s a Match!
          </h1>
          <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-10">
            You and {matchedProfile.name} have liked each other. Set off a spark!
          </p>

          <div className="flex flex-col gap-4 w-full max-w-xs relative z-10">
            <Link
              href="/chat"
              className="py-4 rounded-full bg-gradient-to-r from-[#ff4b72] to-[#8b5cf6] text-white font-bold text-sm shadow-xl shadow-pink-500/20 hover:scale-105 transition-transform text-center"
            >
              Send Message
            </Link>
            <button
              onClick={() => setMatchedProfile(null)}
              className="py-4 rounded-full border border-white/10 bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-colors cursor-pointer"
            >
              Keep Swiping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
