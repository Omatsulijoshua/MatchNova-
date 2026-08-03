/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import {
  Heart,
  Send,
  MessageSquare,
  ArrowLeft,
  User,
  ShieldAlert,
  MoreVertical,
  Circle,
} from 'lucide-react';

interface MatchUser {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    photos: string[];
  };
}

interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  user1: MatchUser;
  user2: MatchUser;
}

interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export default function ChatPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMatches = useCallback(async (authToken: string) => {
    setTimeout(() => {
      setLoadingMatches(true);
    }, 0);
    try {
      const baseUrl = 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/swipes/matches`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as Match[];
        setMatches(data);
      }
    } catch (err) {
      console.error('Error fetching matches list:', err);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  const selectConversation = useCallback(async (match: Match) => {
    setSelectedMatch(match);
    setIsTyping(false);
    setLoadingChat(true);
    setMessages([]);
    setError('');

    try {
      const storedToken = localStorage.getItem('accessToken') || '';
      const baseUrl = 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/chat/history/${match.id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load chat history.');
      }

      const data = await response.json() as Message[];
      setMessages(data);

      // Join chat room in socket
      socket?.emit('join_room', { matchId: match.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching messages.');
    } finally {
      setLoadingChat(false);
    }
  }, [socket]);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUserStr = localStorage.getItem('user');

    if (!storedToken || !storedUserStr) {
      router.push('/auth');
      return;
    }

    const parsedUser = JSON.parse(storedUserStr) as { id: string };
    
    // Defer state update to prevent set-state-in-effect warning
    setTimeout(() => {
      setUserId(parsedUser.id);
    }, 0);

    fetchMatches(storedToken);

    // Initialize Socket.io Connection
    const newSocket = io('http://localhost:3000', {
      auth: { token: `Bearer ${storedToken}` },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Websocket connected to backend!');
    });

    newSocket.on('message', (msg: Message) => {
      // Append message if it belongs to currently active room
      setMessages((prev) => {
        if (msg.matchId === selectedMatch?.id && !prev.some((m) => m.id === msg.id)) {
          return [...prev, msg];
        }
        return prev;
      });
      scrollToBottom();
    });

    newSocket.on('typing', (data: { matchId: string; typing: boolean }) => {
      if (data.matchId === selectedMatch?.id) {
        setIsTyping(data.typing);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [router, selectedMatch?.id, fetchMatches, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMatch || !socket) return;

    const payload = {
      matchId: selectedMatch.id,
      content: newMessage.trim(),
    };

    socket.emit('send_message', payload);
    setNewMessage('');
    // Stop typing emitter
    socket.emit('typing', { matchId: selectedMatch.id, typing: false });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!socket || !selectedMatch) return;

    socket.emit('typing', {
      matchId: selectedMatch.id,
      typing: e.target.value.length > 0,
    });
  };

  const getOpponent = (match: Match): MatchUser => {
    return match.user1Id === userId ? match.user2 : match.user1;
  };

  return (
    <div className="flex-1 flex min-h-screen bg-[#09090b]">
      {/* Decorative Blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-[#ff4b72]/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 flex max-w-7xl mx-auto border-x border-white/5 bg-[#0d0d12]/50 relative z-10 w-full overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-full md:w-80 flex flex-col border-r border-white/5 ${
          selectedMatch ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <Link href="/deck" className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Swipe Deck</span>
            </Link>
            <Heart className="w-5 h-5 text-[#ff4b72] fill-[#ff4b72]" />
          </div>

          <div className="p-4">
            <h2 className="font-['Outfit'] text-lg font-bold text-zinc-200">Conversations</h2>
          </div>

          {/* Matches List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {loadingMatches ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <div className="animate-spin rounded-full h-5 w-5 border border-t-transparent border-[#ff4b72]"></div>
                <span className="text-xs text-zinc-500">Loading threads...</span>
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-20 px-4">
                <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  No active matches found. Head back to the Swipe Deck to find sparks!
                </p>
              </div>
            ) : (
              matches.map((match) => {
                const opponent = getOpponent(match);
                const isSelected = selectedMatch?.id === match.id;
                return (
                  <button
                    key={match.id}
                    onClick={() => selectConversation(match)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                      isSelected
                        ? 'bg-white/5 border border-white/10'
                        : 'border border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="relative">
                      {opponent.profile?.photos?.[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={opponent.profile.photos[0]}
                          alt={opponent.profile.firstName}
                          className="w-12 h-12 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-zinc-500">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <Circle className="w-2.5 h-2.5 bg-emerald-500 text-emerald-500 rounded-full absolute bottom-0 right-0 border-2 border-[#09090b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-zinc-200 truncate">
                        {opponent.profile?.firstName || 'Nova User'} {opponent.profile?.lastName || ''}
                      </h4>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        Click to start chat history...
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat Window */}
        <section className={`flex-1 flex flex-col bg-[#0b0a0f]/30 ${
          !selectedMatch ? 'hidden md:flex items-center justify-center text-center p-6' : 'flex'
        }`}>
          {selectedMatch ? (
            <>
              {/* Top Banner */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0d0d12]/30 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors md:hidden"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  {getOpponent(selectedMatch).profile?.photos?.[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={getOpponent(selectedMatch).profile.photos[0]}
                      alt={getOpponent(selectedMatch).profile.firstName}
                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-zinc-500">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-zinc-200">
                      {getOpponent(selectedMatch).profile?.firstName || 'Nova User'}{' '}
                      {getOpponent(selectedMatch).profile?.lastName || ''}
                    </h3>
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      Online
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/deck`}
                    className="p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <ShieldAlert className="w-4.5 h-4.5" />
                  </Link>
                  <button className="p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <MoreVertical className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingChat ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-[#ff4b72]"></div>
                    <span className="text-xs text-zinc-500">Retrieving chat log...</span>
                  </div>
                ) : error ? (
                  <div className="text-center text-xs text-red-400 py-10">{error}</div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                          isOwn
                            ? 'bg-gradient-to-tr from-[#ff4b72] to-[#8b5cf6] text-white rounded-br-none'
                            : 'bg-white/5 border border-white/5 text-zinc-200 rounded-bl-none'
                        }`}>
                          <p>{msg.content}</p>
                          <span className="block text-[9px] text-white/50 text-right mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/5 text-zinc-400 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer */}
              <form onSubmit={sendMessage} className="p-4 border-t border-white/5 bg-[#0d0d12]/30 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleTyping}
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-[#ff4b72] transition-colors"
                />
                <button
                  type="submit"
                  className="p-3.5 rounded-full bg-gradient-to-tr from-[#ff4b72] to-[#8b5cf6] text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center text-[#ff4b72] mx-auto">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-['Outfit'] text-lg font-bold text-zinc-200">Your Conversations</h3>
                <p className="text-xs text-zinc-500 max-w-[200px] mx-auto mt-1 leading-relaxed">
                  Select a match from the sidebar to view chat logs and start messaging.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
