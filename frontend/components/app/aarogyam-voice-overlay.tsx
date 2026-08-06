'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession, useAgent, useSessionMessages, useSessionContext } from '@livekit/components-react';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { TokenSource } from 'livekit-client';
import {
  Mic,
  MicOff,
  MessageSquare,
  PhoneOff,
  Send,
  AlertCircle,
  Loader2,
  HeartPulse
} from 'lucide-react';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { getSandboxTokenSource } from '@/lib/utils';
import { RoomAudioRenderer } from '@livekit/components-react';

interface AarogyamVoiceOverlayProps {
  onClose: () => void;
}

function InnerVoiceOverlay({ onClose }: AarogyamVoiceOverlayProps) {
  const session = useSessionContext();
  if (!session) return null;
  const { state: agentState } = useAgent();
  const { messages } = useSessionMessages(session);
  const [micState, setMicState] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [connectError, setConnectError] = useState<Error | null>(null);

  // Derive state variables before useEffect hooks to resolve scope dependencies
  const isConnecting = session.connectionState === 'connecting';
  const isConnected = session.isConnected;
  const connectionFailed = session.connectionState === 'disconnected' && connectError;

  // Proactively request and verify mic permission
  const checkMicPermission = async () => {
    setMicState('checking');
    setConnectError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState('granted');
    } catch (err: any) {
      console.error('Microphone permission error:', err);
      setMicState('denied');
      setErrorMessage(
        err?.message ||
          'Microphone permission denied. Please allow access in browser settings to speak to Aarogyam.'
      );
      return;
    }

    try {
      // Connect to the room first without publishing the microphone track
      await session.start({
        tracks: {
          microphone: {
            enabled: false,
          },
        },
      });
    } catch (err: any) {
      console.error('Session start error:', err);
      setConnectError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Publish and enable the microphone track after the engine connects and is stable
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isConnected && session.room && session.room.state === 'connected') {
      timeoutId = setTimeout(() => {
        session.room!.localParticipant.setMicrophoneEnabled(true)
          .then(() => {
            setIsMuted(false);
          })
          .catch((err) => {
            console.warn('Microphone track auto-publish warning:', err);
          });
      }, 800);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isConnected, session.room]);

  useEffect(() => {
    checkMicPermission();
    return () => {
      // Safe cleanup only if session is active
      if (session.room && session.connectionState !== 'disconnected') {
        session.end().catch((err) => console.warn('Clean shutdown of session on cleanup:', err));
      }
    };
  }, []);

  // Sync conversation history to localStorage
  const [conversationId] = useState(() => `conv_${Date.now()}`);

  useEffect(() => {
    if (messages.length > 0) {
      const stored = localStorage.getItem('aarogyam_conversations');
      const conversations = stored ? JSON.parse(stored) : [];

      const updatedMessages = messages.map((msg) => ({
        id: msg.id,
        sender: msg.from?.isLocal ? 'user' : ('assistant' as const),
        text: msg.message,
        timestamp: msg.timestamp,
      }));

      const firstUserMsg = updatedMessages.find((m) => m.sender === 'user')?.text || 'Voice Consultation';
      const summary = firstUserMsg.length > 30 ? `${firstUserMsg.substring(0, 30)}...` : firstUserMsg;

      const conversationItem = {
        id: conversationId,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        messages: updatedMessages,
        summary,
      };

      const existingIndex = conversations.findIndex((c: any) => c.id === conversationId);
      if (existingIndex > -1) {
        conversations[existingIndex] = conversationItem;
      } else {
        conversations.unshift(conversationItem);
      }
      localStorage.setItem('aarogyam_conversations', JSON.stringify(conversations));
    }
  }, [messages, conversationId]);

  // Auto-scroll chat transcripts
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  // Handle Mute/Unmute microphone
  const toggleMute = () => {
    if (session.room) {
      const localAudio = session.room.localParticipant.audioTrackPublications.values().next().value;
      if (localAudio && localAudio.track) {
        if (isMuted) {
          localAudio.track.unmute();
          setIsMuted(false);
        } else {
          localAudio.track.mute();
          setIsMuted(true);
        }
      } else {
        // Fallback toggling
        setIsMuted(!isMuted);
      }
    }
  };

  // Send a custom text message via LiveKit
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textMessage.trim()) return;
    
    try {
      // Publish text message via LiveKit data channel
      if (session.room && session.room.state === 'connected') {
        const encoder = new TextEncoder();
        const data = encoder.encode(textMessage.trim());
        // Handle publishData gracefully in case chat messages are not supported by the current backend
        await session.room.localParticipant.publishData(data, {
          reliable: true,
          topic: 'chat',
        }).catch((err) => {
          console.warn('Backend chat data channel not ready or unsupported:', err);
        });
      }
      setTextMessage('');
    } catch (err) {
      console.warn('Gracefully handled chat send error:', err);
    }
  };

  // Clean disconnect & close
  const handleDisconnect = () => {
    if (session.room && session.connectionState !== 'disconnected') {
      session.end().catch((err) => console.warn('Clean shutdown on disconnect:', err));
    }
    onClose();
  };

  // Derive Orb state color and scale multiplier
  let orbClass = 'bg-slate-500 shadow-slate-500/30';
  let statusText = 'Connecting...';
  
  if (isConnecting) {
    orbClass = 'bg-cyan-500 shadow-[0_0_60px_rgba(6,182,212,0.6)] animate-pulse';
    statusText = 'Initializing Connection...';
  } else if (connectionFailed) {
    orbClass = 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.6)]';
    statusText = 'Connection Failed';
  } else if (isConnected) {
    switch (agentState) {
      case 'listening':
        orbClass = 'bg-emerald-500 shadow-[0_0_70px_rgba(16,185,129,0.7)] scale-105';
        statusText = 'Listening...';
        break;
      case 'thinking':
        orbClass = 'bg-amber-500 shadow-[0_0_70px_rgba(245,158,11,0.7)] animate-pulse scale-100';
        statusText = 'Thinking...';
        break;
      case 'speaking':
        orbClass = 'bg-blue-600 shadow-[0_0_80px_rgba(37,99,235,0.8)] scale-115';
        statusText = 'Speaking...';
        break;
      default:
        orbClass = 'bg-slate-400 shadow-[0_0_50px_rgba(148,163,184,0.5)] scale-100';
        statusText = 'Ready';
        break;
    }
  }

  // Get the single latest user or assistant message for subtitles
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-white backdrop-blur-xl animate-in fade-in duration-300">
      {/* Mic permission fallbacks */}
      {micState === 'checking' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mb-4" />
          <h2 className="text-xl font-semibold">Allow Microphone Access</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-sm">
            Please approve microphone permissions to connect to Aarogyam.
          </p>
        </div>
      )}

      {micState === 'denied' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mb-6">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Microphone Needed</h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Aarogyam cannot communicate without microphone access. Please allow permissions in your browser.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-left text-xs font-mono text-red-300">
            Error: {errorMessage}
          </div>
          <div className="mt-8 flex gap-3 w-full">
            <button
              onClick={checkMicPermission}
              className="flex-1 rounded-full bg-emerald-500 py-3 text-sm font-semibold hover:bg-emerald-600 transition"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-full bg-white/5 py-3 text-sm font-semibold hover:bg-white/10 transition text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main custom dashboard views */}
      {micState === 'granted' && (
        <div className="flex-1 flex flex-col h-full relative">
          
          {/* Header Bar */}
          <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/20 z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-md">
                <HeartPulse className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white">Aarogyam AI</h3>
                <p className="text-[10px] text-slate-400 font-medium">Voice Companion</p>
              </div>
            </div>

            {/* State Status badge */}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              <span className={`h-2 w-2 rounded-full ${
                agentState === 'listening' ? 'bg-emerald-500 animate-pulse' :
                agentState === 'thinking' ? 'bg-amber-500 animate-spin' :
                agentState === 'speaking' ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'
              }`} />
              {statusText}
            </div>

            {/* Mode selection toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode(mode === 'voice' ? 'chat' : 'voice')}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{mode === 'voice' ? 'Chat Mode' : 'Voice Mode'}</span>
              </button>
            </div>
          </header>

          {/* Core Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {mode === 'voice' ? (
              /* VOICE MODE UI */
              <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                
                {/* Blur Background Layer */}
                <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 via-blue-500/5 to-transparent pointer-events-none" />

                {/* Morphing AI Orb Core */}
                <div className="relative flex items-center justify-center h-80 w-80">
                  {/* Outer Pulsing Glass Ring 2 */}
                  <div className="absolute w-72 h-72 rounded-[52%_48%_55%_45%/_48%_52%_45%_55%] border border-white/5 animate-[spin_16s_linear_infinite_reverse]" />
                  {/* Outer Pulsing Glass Ring 1 */}
                  <div className="absolute w-64 h-64 rounded-[48%_52%_45%_55%/_52%_48%_55%_45%] border border-white/10 animate-[spin_10s_linear_infinite]" />
                  
                  {/* Glowing core sphere */}
                  <div className={`w-44 h-44 rounded-full blur-xs transition-all duration-700 mix-blend-screen flex items-center justify-center animate-orb-glow ${orbClass}`}>
                    <Mic className="h-10 w-10 text-white opacity-40 animate-pulse" />
                  </div>
                </div>

                {/* Subtitle Real-time Transcript */}
                <div className="mt-8 max-w-lg w-full text-center px-4 min-h-[60px] flex flex-col justify-center">
                  {latestMessage ? (
                    <div className="animate-in fade-in slide-in-from-bottom duration-300">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        {latestMessage.from?.isLocal ? 'You' : 'Aarogyam'}
                      </p>
                      <p className="text-base text-slate-200 font-medium leading-relaxed italic">
                        "{latestMessage.message}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {isConnecting ? 'Waiting for voice server...' : 'Say something to start speaking...'}
                    </p>
                  )}
                </div>

                {/* CSS animated active audio waveform */}
                {agentState === 'speaking' && (
                  <div className="mt-6 flex items-end justify-center gap-1.5 h-8">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-full animate-waveform"
                        style={{
                          height: '100%',
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* CHAT MODE UI */
              <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40">
                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 [scrollbar-width:thin]">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
                      <MessageSquare className="h-12 w-12 text-slate-700 mb-3" />
                      <p className="font-semibold text-sm">No chat transcripts yet</p>
                      <p className="text-xs text-slate-500 mt-1">Start speaking or type a message below</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[80%] animate-in fade-in slide-in-from-bottom duration-200 ${
                          msg.from?.isLocal ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                          {msg.from?.isLocal ? 'You' : 'Aarogyam'}
                        </p>
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm shadow-md leading-relaxed ${
                            msg.from?.isLocal
                              ? 'bg-slate-100 text-slate-900 rounded-tr-none'
                              : 'bg-emerald-500 text-white rounded-tl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                  {agentState === 'thinking' && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 mr-auto p-2 bg-white/5 rounded-full animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                      Aarogyam is thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Text Message Form */}
                <form onSubmit={handleSendText} className="p-4 border-t border-white/5 bg-black/20 flex gap-2">
                  <input
                    type="text"
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    placeholder="Type a message to Aarogyam..."
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-emerald-500 focus:outline-none transition text-sm text-white"
                  />
                  <button
                    type="submit"
                    disabled={!textMessage.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Action Controllers Footer */}
          <footer className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-center gap-6">
            {/* Mic Mute Toggle */}
            <button
              onClick={toggleMute}
              className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
                isMuted
                  ? 'border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* End Call red button */}
            <button
              onClick={handleDisconnect}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 hover:scale-105 transition-all text-white shadow-lg shadow-red-600/30"
              title="Disconnect session"
            >
              <PhoneOff className="h-6 w-6" />
            </button>

            {/* Chat Mode trigger inside footer */}
            <button
              onClick={() => setMode(mode === 'voice' ? 'chat' : 'voice')}
              className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
                mode === 'chat'
                  ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
              title="Toggle chat logs"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}

// Helper hook to retrieve session states reliably

export function AarogyamVoiceOverlay({ onClose }: AarogyamVoiceOverlayProps) {
  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(APP_CONFIG_DEFAULTS)
      : TokenSource.endpoint('/api/token');
  }, []);

  const session = useSession(
    tokenSource,
    APP_CONFIG_DEFAULTS.agentName ? { agentName: APP_CONFIG_DEFAULTS.agentName } : undefined
  );

  return (
    <AgentSessionProvider session={session}>
      <style>{`
        @keyframes aarogyam-waveform {
          0%, 100% {
            transform: scaleY(0.15);
          }
          50% {
            transform: scaleY(1.0);
          }
        }
        .animate-waveform {
          animation: aarogyam-waveform 1.2s ease-in-out infinite;
          transform-origin: bottom;
        }
        @keyframes aarogyam-orb-glow {
          0%, 100% {
            transform: scale(1.0);
            filter: blur(4px) brightness(1);
          }
          50% {
            transform: scale(1.08);
            filter: blur(8px) brightness(1.2);
          }
        }
        .animate-orb-glow {
          animation: aarogyam-orb-glow 4s ease-in-out infinite;
        }
      `}</style>
      <InnerVoiceOverlay onClose={onClose} />
      <RoomAudioRenderer />
    </AgentSessionProvider>
  );
}
