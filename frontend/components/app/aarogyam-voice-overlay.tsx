'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  useSession,
  useAgent,
  useSessionMessages,
  useSessionContext,
  useLocalParticipant,
  useIsSpeaking
} from '@livekit/components-react';
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
  HeartPulse,
  X,
  Volume2
} from 'lucide-react';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { getSandboxTokenSource } from '@/lib/utils';
import { RoomAudioRenderer } from '@livekit/components-react';
import { useLanguage } from '@/components/app/providers';

interface AarogyamVoiceOverlayProps {
  onClose: () => void;
}

interface VoiceStateTranslations {
  welcome: string;
  supportingReady: string;
  talkToAarogyam: string;
  connecting: string;
  pleaseWait: string;
  listening: string;
  listeningActive: string;
  goAhead: string;
  speaking: string;
  ended: string;
  endedSupporting: string;
  talkAgain: string;
  micBlocked: string;
  micInstructions: string;
  retry: string;
  cancel: string;
  connectionError: string;
  failedToConnect: string;
  tryAgain: string;
}

const overlayTranslations: Record<string, VoiceStateTranslations> = {
  English: {
    welcome: "Welcome to Aarogyam AI",
    supportingReady: "Your AI voice health companion. Speak naturally in Hindi, Hinglish, or English.",
    talkToAarogyam: "Talk to Aarogyam",
    connecting: "Connecting to Aarogyam...",
    pleaseWait: "Please wait while we connect your voice session.",
    listening: "Listening to you",
    listeningActive: "Listening (You are speaking)",
    goAhead: "Go ahead, I'm listening.",
    speaking: "Aarogyam is speaking",
    ended: "Conversation ended",
    endedSupporting: "I'm here whenever you need help.",
    talkAgain: "Talk Again",
    micBlocked: "Microphone access is blocked.",
    micInstructions: "Please allow microphone access in your browser settings, then try again.",
    retry: "Retry",
    cancel: "Cancel",
    connectionError: "Connection Error",
    failedToConnect: "Failed to connect to Aarogyam. Please check your connection.",
    tryAgain: "Try Again",
  },
  'हिन्दी': {
    welcome: "आरोग्यम AI में आपका स्वागत है",
    supportingReady: "आपका व्यक्तिगत वॉइस हेल्थ साथी। हिंदी, हिंग्लिश या अंग्रेजी में सहजता से बात करें।",
    talkToAarogyam: "आरोग्यम से बात करें",
    connecting: "आरोग्यम से जुड़ रहे हैं...",
    pleaseWait: "कृपया प्रतीक्षा करें जब तक हम आपकी वॉइस कॉल कनेक्ट कर रहे हैं।",
    listening: "आपकी बात सुन रहे हैं",
    listeningActive: "सुन रहे हैं (आप बोल रहे हैं)",
    goAhead: "बोलिए, मैं सुन रहा हूँ।",
    speaking: "आरोग्यम बोल रहे हैं",
    ended: "बातचीत समाप्त हुई",
    endedSupporting: "जब भी आपको मदद की आवश्यकता हो, मैं यहाँ हूँ।",
    talkAgain: "फिर से बात करें",
    micBlocked: "माइक्रोफ़ोन एक्सेस ब्लॉक है।",
    micInstructions: "कृपया अपने ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें, फिर प्रयास करें।",
    retry: "पुनः प्रयास करें",
    cancel: "रद्द करें",
    connectionError: "कनेक्शन त्रुटि",
    failedToConnect: "आरोग्यम से कनेक्ट करने में विफल। कृपया अपना इंटरनेट चेक करें।",
    tryAgain: "फिर प्रयास करें",
  },
};

const getTranslation = (lang: string): VoiceStateTranslations => {
  return overlayTranslations[lang] || overlayTranslations['English'];
};

function InnerVoiceOverlay({ onClose }: AarogyamVoiceOverlayProps) {
  const session = useSessionContext();
  if (!session) return null;

  const { state: agentState } = useAgent();
  const { messages } = useSessionMessages(session);
  const { language } = useLanguage();
  const { localParticipant } = useLocalParticipant();
  const isUserSpeaking = useIsSpeaking(localParticipant);

  // States to manage the 5 agent states and re-try flows
  const [hasStarted, setHasStarted] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);

  const [micState, setMicState] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [connectError, setConnectError] = useState<Error | null>(null);

  const tVoice = useMemo(() => getTranslation(language), [language]);

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

  const startSession = async () => {
    setHasStarted(true);
    setIsCallEnded(false);
    setHasConnectedOnce(false);
    setConnectError(null);
    setMicState('checking');
    await checkMicPermission();
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

  // Clean cleanup on unmount
  useEffect(() => {
    return () => {
      if (session.room && session.connectionState !== 'disconnected') {
        session.end().catch((err) => console.warn('Clean shutdown of session on cleanup:', err));
      }
    };
  }, []);

  // Sync session state to tracking variables
  useEffect(() => {
    if (isConnected) {
      setHasConnectedOnce(true);
    }
  }, [isConnected]);

  useEffect(() => {
    if (hasConnectedOnce && session.connectionState === 'disconnected' && !isCallEnded) {
      setIsCallEnded(true);
    }
  }, [session.connectionState, hasConnectedOnce, isCallEnded]);

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
      if (session.room && session.room.state === 'connected') {
        const encoder = new TextEncoder();
        const data = encoder.encode(textMessage.trim());
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

  // Clean disconnect & transition to Call Ended
  const handleDisconnect = () => {
    if (session.room && session.connectionState !== 'disconnected') {
      session.end().catch((err) => console.warn('Clean shutdown on disconnect:', err));
    }
    setIsCallEnded(true);
  };

  // 1. STATE: READY (Not started yet)
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-white backdrop-blur-xl animate-in fade-in duration-300">
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-md">
              <HeartPulse className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Aarogyam AI</h3>
              <p className="text-[10px] text-slate-400 font-medium">Voice Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close Assistant"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
          {/* Central calm glowing orb */}
          <div className="relative flex items-center justify-center h-64 w-64 mb-8">
            <div className="absolute w-56 h-56 rounded-full border border-emerald-500/10 animate-[spin_20s_linear_infinite] animate-pulse-ring" />
            <div className="absolute w-48 h-48 rounded-full border border-emerald-500/5 animate-[spin_25s_linear_infinite_reverse] animate-pulse-ring-fast" />
            <div className="w-36 h-36 rounded-full bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_45px_rgba(16,185,129,0.15)] animate-pulse-slow">
              <HeartPulse className="h-14 w-14 text-emerald-400 opacity-80" />
            </div>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
            {tVoice.welcome}
          </h2>
          <p className="text-sm text-slate-300 mt-4 leading-relaxed max-w-md">
            {tVoice.supportingReady}
          </p>

          <button
            onClick={startSession}
            className="mt-8 px-10 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:scale-[1.03] hover:shadow-emerald-500/35 active:scale-95 transition-all text-base cursor-pointer"
          >
            {tVoice.talkToAarogyam}
          </button>
        </div>
      </div>
    );
  }

  // 2. STATE: CONNECTING (Loading/connecting state)
  const showConnecting = hasStarted && !hasConnectedOnce && !isCallEnded && !connectError && micState !== 'denied';
  if (showConnecting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-white backdrop-blur-xl animate-in fade-in duration-300">
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-md">
              <HeartPulse className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Aarogyam AI</h3>
              <p className="text-[10px] text-slate-400 font-medium">Voice Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close Assistant"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
          {/* Connecting visual orb */}
          <div className="relative flex items-center justify-center h-64 w-64 mb-8">
            <div className="absolute w-56 h-56 rounded-full border border-cyan-500/20 animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute w-48 h-48 rounded-full border border-cyan-500/10 animate-[spin_6s_linear_infinite_reverse]" />
            <div className="w-36 h-36 rounded-full bg-cyan-950/30 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-pulse">
              <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-cyan-100">
            {tVoice.connecting}
          </h2>
          <p className="text-sm text-slate-400 mt-3 max-w-xs leading-relaxed">
            {tVoice.pleaseWait}
          </p>
        </div>
      </div>
    );
  }

  // 4. MICROPHONE ACCESS DENIED VIEW
  if (hasStarted && micState === 'denied') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-white backdrop-blur-xl animate-in fade-in duration-300">
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-md">
              <HeartPulse className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Aarogyam AI</h3>
              <p className="text-[10px] text-slate-400 font-medium">Voice Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close Assistant"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-6">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-red-200">
            {tVoice.micBlocked}
          </h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            {tVoice.micInstructions}
          </p>
          {errorMessage && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-left text-xs font-mono text-red-300/80 w-full overflow-x-auto">
              Error Details: {errorMessage}
            </div>
          )}
          <div className="mt-8 flex gap-3 w-full">
            <button
              onClick={startSession}
              className="flex-1 rounded-full bg-emerald-500 py-3 text-sm font-semibold hover:bg-emerald-600 active:scale-98 transition text-white cursor-pointer"
            >
              {tVoice.retry}
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-full bg-white/5 py-3 text-sm font-semibold hover:bg-white/10 active:scale-98 transition text-slate-300 cursor-pointer"
            >
              {tVoice.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CONNECTION FAILURE ERROR STATE
  if (hasStarted && connectionFailed) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-white backdrop-blur-xl animate-in fade-in duration-300">
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-md">
              <HeartPulse className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Aarogyam AI</h3>
              <p className="text-[10px] text-slate-400 font-medium">Voice Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close Assistant"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-6">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-red-200">
            {tVoice.connectionError}
          </h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            {tVoice.failedToConnect}
          </p>
          {connectError && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-left text-xs font-mono text-red-300/80 w-full overflow-x-auto">
              Error Details: {connectError.message}
            </div>
          )}
          <div className="mt-8 flex gap-3 w-full">
            <button
              onClick={startSession}
              className="flex-1 rounded-full bg-emerald-50 py-3 text-sm font-semibold hover:bg-emerald-600 active:scale-98 transition text-white cursor-pointer"
            >
              {tVoice.tryAgain}
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-full bg-white/5 py-3 text-sm font-semibold hover:bg-white/10 active:scale-98 transition text-slate-300 cursor-pointer"
            >
              {tVoice.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. STATE: CALL ENDED
  if (isCallEnded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-white backdrop-blur-xl animate-in fade-in duration-300">
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-md">
              <HeartPulse className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Aarogyam AI</h3>
              <p className="text-[10px] text-slate-400 font-medium">Voice Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close Assistant"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          {/* Calm ending visual orb */}
          <div className="relative flex items-center justify-center h-64 w-64 mb-8">
            <div className="absolute w-56 h-56 rounded-full border border-white/5 animate-pulse-slow" />
            <div className="w-36 h-36 rounded-full bg-slate-800/40 border border-white/10 flex items-center justify-center shadow-[0_0_35px_rgba(255,255,255,0.05)]">
              <MicOff className="h-12 w-12 text-slate-500" />
            </div>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-200">
            {tVoice.ended}
          </h2>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            {tVoice.endedSupporting}
          </p>

          <div className="mt-8 flex gap-3 w-full animate-in slide-in-from-bottom duration-300">
            <button
              onClick={startSession}
              className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 active:scale-98 transition shadow-md shadow-emerald-500/10 text-white cursor-pointer"
            >
              {tVoice.talkAgain}
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-full bg-white/5 py-3.5 text-sm font-semibold hover:bg-white/10 active:scale-98 transition text-slate-300 cursor-pointer"
            >
              {tVoice.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3 & 4. STATES: LISTENING & SPEAKING (Active session view)
  let orbClass = 'bg-slate-500 shadow-slate-500/30';
  let statusText = tVoice.connecting;
  
  if (isConnecting) {
    orbClass = 'bg-cyan-500 shadow-[0_0_60px_rgba(6,182,212,0.6)] animate-pulse';
    statusText = tVoice.connecting;
  } else if (isConnected) {
    if (agentState === 'speaking') {
      orbClass = 'bg-blue-600 shadow-[0_0_85px_rgba(37,99,235,0.8)] scale-105 animate-orb-glow';
      statusText = tVoice.speaking;
    } else if (agentState === 'thinking') {
      orbClass = 'bg-amber-500 shadow-[0_0_70px_rgba(245,158,11,0.7)] scale-100 animate-pulse';
      statusText = language === 'हिन्दी' ? "आरोग्यम विचार कर रहे हैं..." : "Aarogyam is thinking...";
    } else if (isUserSpeaking) {
      orbClass = 'bg-emerald-500 shadow-[0_0_95px_rgba(16,185,129,0.9)] scale-110';
      statusText = tVoice.listeningActive;
    } else {
      orbClass = 'bg-emerald-600/80 shadow-[0_0_65px_rgba(16,185,129,0.55)] scale-100';
      statusText = tVoice.listening;
    }
  }

  // Get the single latest message for real-time subtitle translation
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-white backdrop-blur-xl animate-in fade-in duration-300">
      
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
            agentState === 'listening' ? (isUserSpeaking ? 'bg-emerald-400 animate-pulse-fast' : 'bg-emerald-500 animate-pulse') :
            agentState === 'thinking' ? 'bg-amber-500 animate-pulse' :
            agentState === 'speaking' ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'
          }`} />
          {statusText}
        </div>

        {/* Mode selection toggle & Exit */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(mode === 'voice' ? 'chat' : 'voice')}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{mode === 'voice' ? 'Chat Mode' : 'Voice Mode'}</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close Assistant"
          >
            <X className="h-5 w-5" />
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
              {/* Outer Pulsing Glass Rings */}
              <div className={`absolute w-72 h-72 rounded-[52%_48%_55%_45%/_48%_52%_45%_55%] border transition-all duration-500 animate-[spin_16s_linear_infinite_reverse] ${
                agentState === 'speaking' ? 'border-blue-500/10 animate-pulse-ring' :
                isUserSpeaking ? 'border-emerald-400/20 animate-pulse-ring-fast' : 'border-white/5 animate-pulse-ring'
              }`} />
              <div className={`absolute w-64 h-64 rounded-[48%_52%_45%_55%/_52%_48%_55%_45%] border transition-all duration-500 animate-[spin_10s_linear_infinite] ${
                agentState === 'speaking' ? 'border-blue-500/20 animate-pulse-ring-fast' :
                isUserSpeaking ? 'border-emerald-400/30 animate-pulse-ring-fast' : 'border-white/10 animate-pulse-ring'
              }`} />
              
              {/* Glowing core sphere */}
              <div className={`w-44 h-44 rounded-full blur-xs transition-all duration-700 mix-blend-screen flex items-center justify-center animate-orb-glow ${orbClass}`}>
                {agentState === 'speaking' ? (
                  <Volume2 className="h-10 w-10 text-white opacity-90 animate-pulse" />
                ) : (
                  <Mic className={`h-10 w-10 text-white transition-opacity ${isUserSpeaking ? 'opacity-90' : 'opacity-50'}`} />
                )}
              </div>
            </div>

            {/* Subtitle Real-time Transcript */}
            <div className="mt-8 max-w-lg w-full text-center px-4 min-h-[60px] flex flex-col justify-center bg-slate-900/25 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
              {latestMessage ? (
                <div className="animate-in fade-in slide-in-from-bottom duration-300">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                    {latestMessage.from?.isLocal ? 'You' : 'Aarogyam'}
                  </p>
                  <p className="text-base text-slate-100 font-medium leading-relaxed italic">
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
              <div className="mt-6 flex items-end justify-center gap-1.5 h-8 animate-in fade-in duration-300">
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
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all cursor-pointer ${
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
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 hover:scale-105 transition-all text-white shadow-lg shadow-red-600/30 cursor-pointer"
          title="Disconnect session"
        >
          <PhoneOff className="h-6 w-6" />
        </button>

        {/* Chat Mode trigger inside footer */}
        <button
          onClick={() => setMode(mode === 'voice' ? 'chat' : 'voice')}
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all cursor-pointer ${
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
  );
}

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
        @keyframes aarogyam-pulse-slow {
          0%, 100% {
            transform: scale(1.0);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.05);
            opacity: 1.0;
          }
        }
        .animate-pulse-slow {
          animation: aarogyam-pulse-slow 3s ease-in-out infinite;
        }
        @keyframes aarogyam-pulse-ring {
          0% {
            transform: scale(0.95);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.5;
          }
          100% {
            transform: scale(0.95);
            opacity: 0.2;
          }
        }
        .animate-pulse-ring {
          animation: aarogyam-pulse-ring 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes aarogyam-pulse-ring-fast {
          0% {
            transform: scale(0.95);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.7;
          }
          100% {
            transform: scale(0.95);
            opacity: 0.3;
          }
        }
        .animate-pulse-ring-fast {
          animation: aarogyam-pulse-ring-fast 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <InnerVoiceOverlay onClose={onClose} />
      <RoomAudioRenderer />
    </AgentSessionProvider>
  );
}
