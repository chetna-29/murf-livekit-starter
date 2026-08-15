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
  Volume2,
  Brain,
  Shield,
  Globe,
  Check,
  Copy,
  Keyboard,
  Leaf,
  Heart,
  Sparkles,
  Activity,
  BriefcaseMedical,
  ShieldAlert,
  Info,
  Lock
} from 'lucide-react';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { getSandboxTokenSource } from '@/lib/utils';
import { RoomAudioRenderer } from '@livekit/components-react';
import { useLanguage, useAuth } from '@/components/app/providers';

interface AarogyamVoiceOverlayProps {
  onClose?: () => void;
  isEmbedded?: boolean;
  onNavigateTab?: (tabName: any) => void;
  autoStart?: boolean;
  isFuturistic?: boolean;
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

function InnerVoiceOverlay({ onClose, isEmbedded = false, onNavigateTab, autoStart = false, isFuturistic = false }: AarogyamVoiceOverlayProps) {
  const session = useSessionContext();
  if (!session) return null;
  return <InnerVoiceOverlayContent onClose={onClose} isEmbedded={isEmbedded} onNavigateTab={onNavigateTab} autoStart={autoStart} isFuturistic={isFuturistic} session={session} />;
}

function InnerVoiceOverlayContent({ onClose, isEmbedded = false, onNavigateTab, autoStart = false, isFuturistic = false, session }: AarogyamVoiceOverlayProps & { session: any }) {

  const agent = useAgent();
  const agentState = agent.state;
  const agentRole = agent?.attributes?.agent_role || 'main_agent';
  const { messages } = useSessionMessages(session);
  const { language } = useLanguage();
  const { user } = useAuth();
  const { localParticipant } = useLocalParticipant();
  const isUserSpeaking = useIsSpeaking(localParticipant);

  // States to manage the 5 agent states and re-try flows
  const [hasStarted, setHasStarted] = useState(autoStart);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);

  const [micState, setMicState] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [connectError, setConnectError] = useState<Error | null>(null);

  const isConnecting = session.connectionState === 'connecting';
  const isConnected = session.isConnected;
  const connectionFailed = session.connectionState === 'disconnected' && connectError;
  const showConnecting = hasStarted && !hasConnectedOnce && !isCallEnded && !connectError && micState !== 'denied';

  // Embedded Session Info timer states
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<string>('');

  useEffect(() => {
    if (autoStart) {
      startSession();
    }
  }, [autoStart]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      setSessionStartTime(new Date().toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
      setSessionDuration(0);
      timer = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      setSessionDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const tVoice = useMemo(() => getTranslation(language), [language]);

  // Determine the avatar image src dynamically based on the state
  const avatarSrc = useMemo(() => {
    if (isCallEnded) {
      return '/avatar/doctor-completed.png';
    }
    const isThinking = agentState === 'thinking';
    const lastTwoMessages = messages.slice(-2);
    const hasToolContext = lastTwoMessages.some(m => {
      const text = m.message?.toLowerCase() || '';
      return text.includes('escalat') || text.includes('support') || text.includes('save') || text.includes('clinic') || text.includes('hospital') || text.includes('appointment');
    });

    const isCheckingInfo = 
      isConnecting || 
      showConnecting || 
      (isThinking && (
        agentRole === 'clinic_specialist' ||
        agentRole === 'clinic_specialist_connecting' ||
        agentRole === 'main_agent_connecting' ||
        hasToolContext
      ));

    if (isCheckingInfo) {
      return '/avatar/doctor-checking.png';
    }
    if (isThinking) {
      return '/avatar/doctor-thinking.png';
    }
    if (agentState === 'speaking') {
      return '/avatar/doctor-speaking.png';
    }
    if (agentState === 'listening' || isUserSpeaking) {
      return '/avatar/doctor-listening.png';
    }
    return '/avatar/doctor-ready.png';
  }, [agentState, agentRole, isUserSpeaking, isCallEnded, isConnecting, showConnecting, messages]);

  // Get the single latest message for real-time subtitle translation
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  // Proactively request and verify mic permission
  async function checkMicPermission() {
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
  }

  async function startSession() {
    setHasStarted(true);
    setIsCallEnded(false);
    setHasConnectedOnce(false);
    setConnectError(null);
    setMicState('checking');
    await checkMicPermission();
  }

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
      const key = user ? `aarogyam_conversations_${user.email.trim().toLowerCase()}` : 'aarogyam_conversations';
      const stored = localStorage.getItem(key);
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
      localStorage.setItem(key, JSON.stringify(conversations));
    }
  }, [messages, conversationId, user]);

  // Auto-scroll chat transcripts
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  // Handle Mute/Unmute microphone
  function toggleMute() {
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
  }

  // Send a custom text message via LiveKit
  async function handleSendText(e: React.FormEvent) {
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
  }

  // Clean disconnect & transition to Call Ended
  function handleDisconnect() {
    if (session.room && session.connectionState !== 'disconnected') {
      session.end().catch((err) => console.warn('Clean shutdown on disconnect:', err));
    }
    setIsCallEnded(true);
  }

  if (isFuturistic) {
    let badgeColor = 'bg-slate-800/40 text-slate-400 border-slate-700/50';
    let statusText = 'Offline';
    let pulseColor = 'bg-slate-500';

    if (showConnecting || isConnecting) {
      badgeColor = 'bg-blue-950/40 text-blue-400 border-blue-900/30';
      statusText = 'Connecting';
      pulseColor = 'bg-blue-400 animate-pulse';
    } else if (isConnected) {
      if (agentRole === 'clinic_specialist_connecting') {
        badgeColor = 'bg-amber-950/40 text-amber-400 border-amber-900/30';
        statusText = 'Connecting to specialist...';
        pulseColor = 'bg-amber-500 animate-pulse';
      } else if (agentRole === 'main_agent_connecting') {
        badgeColor = 'bg-amber-950/40 text-amber-400 border-amber-900/30';
        statusText = 'Connecting to Aarogyam...';
        pulseColor = 'bg-amber-500 animate-pulse';
      } else {
        if (agentState === 'speaking') {
          badgeColor = 'bg-blue-950/40 text-blue-400 border-blue-900/30';
          statusText = agentRole === 'clinic_specialist' ? 'Specialist Speaking' : 'Speaking';
          pulseColor = 'bg-blue-500 animate-pulse-slow';
        } else if (agentState === 'thinking') {
          badgeColor = 'bg-amber-950/40 text-amber-400 border-amber-900/30';
          statusText = agentRole === 'clinic_specialist' ? 'Specialist Thinking' : 'Thinking';
          pulseColor = 'bg-amber-500 animate-pulse';
        } else if (isUserSpeaking) {
          badgeColor = 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30';
          statusText = agentRole === 'clinic_specialist' ? 'Specialist Listening' : 'Listening';
          pulseColor = 'bg-emerald-400 animate-ping';
        } else {
          badgeColor = 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30';
          statusText = agentRole === 'clinic_specialist' ? 'Specialist Connected' : 'Listening';
          pulseColor = 'bg-emerald-500 animate-pulse';
        }
      }
    } else if (isCallEnded) {
      badgeColor = 'bg-rose-950/40 text-rose-400 border-rose-900/30';
      statusText = 'Ended';
      pulseColor = 'bg-rose-500';
    }

    let orbClass = 'bg-slate-700/40 border border-white/10 shadow-none';
    if (showConnecting || isConnecting) {
      orbClass = 'bg-cyan-500/20 border border-cyan-400/30 shadow-[0_0_65px_rgba(6,182,212,0.4)] animate-pulse';
    } else if (isConnected) {
      if (agentState === 'speaking') {
        orbClass = 'bg-[#0D9488]/40 border border-teal-400/50 shadow-[0_0_80px_rgba(20,184,166,0.6)] scale-105 animate-orb-glow';
      } else if (agentState === 'thinking') {
        orbClass = 'bg-amber-500/20 border border-amber-400/30 shadow-[0_0_60px_rgba(245,158,11,0.4)] scale-100 animate-pulse';
      } else if (isUserSpeaking) {
        orbClass = 'bg-emerald-500/30 border border-emerald-400/60 shadow-[0_0_90px_rgba(16,185,129,0.7)] scale-110';
      } else {
        orbClass = 'bg-[#059669]/25 border border-emerald-500/30 shadow-[0_0_55px_rgba(16,185,129,0.3)] scale-100';
      }
    }

    let promptHeader = "I'm listening...";
    let promptSub = "You can speak now";
    if (showConnecting || isConnecting) {
      promptHeader = "Connecting to Aarogyam...";
      promptSub = "Please wait while I prepare our conversation";
    } else if (agentState === 'speaking') {
      promptHeader = "Aarogyam is speaking";
      promptSub = agentRole === 'clinic_specialist' ? "Connected to Clinic & Appointment Specialist" : "Listen to the response";
    } else if (agentState === 'thinking') {
      promptHeader = "Thinking...";
      promptSub = agentRole === 'clinic_specialist' ? "Connected to Clinic & Appointment Specialist" : "Aarogyam is synthesizing response";
    } else if (isCallEnded) {
      promptHeader = "Conversation ended";
      promptSub = "Choose an option below to proceed";
    } else {
      if (agentRole === 'clinic_specialist_connecting') {
        promptHeader = "Connecting you to a clinic specialist...";
        promptSub = "Please wait...";
      } else if (agentRole === 'clinic_specialist') {
        promptHeader = "I'm listening...";
        promptSub = "Connected to Clinic & Appointment Specialist";
      } else if (agentRole === 'main_agent_connecting') {
        promptHeader = "Connecting back to Aarogyam...";
        promptSub = "Please wait...";
      }
    }

    const userMessages = messages.filter((m: any) => m.from?.isLocal);
    const assistantMessages = messages.filter((m: any) => !m.from?.isLocal);
    const lastUserMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
    const lastAssistantMsg = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;

    return (
      <div className="min-h-screen bg-[#070A13] text-white flex flex-col justify-between overflow-hidden relative font-sans select-none">
        
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* Header Bar */}
        <header className="bg-[#0F1424]/40 border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100 leading-tight">Aarogyam AI</p>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Voice Health Companion</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Dynamic Status Badge */}
            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
              <span className={`h-2 w-2 rounded-full ${pulseColor}`} />
              {statusText}
            </div>

            {/* Header End Call Button */}
            {hasStarted && !isCallEnded && (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4.5 py-1.5 text-xs font-black shadow-md shadow-rose-600/20 transition hover:scale-102 cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                End Call
              </button>
            )}
          </div>
        </header>

        {/* Core Layout Grid */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 items-stretch z-10 overflow-y-auto">
          
          {/* LEFT: Voice assistant active card */}
          <div className="lg:col-span-2 bg-[#0F1424]/30 border border-white/5 rounded-[32px] p-8 flex flex-col justify-between backdrop-blur-xl relative overflow-hidden">
            
            {/* Card header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-black border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 rounded-full">AI Voice Studio</span>
                <h2 className="text-2xl font-black text-slate-100 mt-3">Talk to Aarogyam</h2>
                <p className="text-xs text-slate-400 font-medium mt-1">Speak naturally in Hindi, Hinglish, or English. I'm here to help.</p>
              </div>
            </div>

            {/* Center Area: Voice Orb Visualizer OR Chat Log view */}
            <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[360px]">
              
              {mode === 'voice' ? (
                /* Voice Interface Visuals */
                <div className="flex flex-col items-center justify-center w-full relative">
                  
                  {/* Glowing AI Orb with rotating rings */}
                  <div className="relative flex items-center justify-center h-72 w-72 mb-6">
                    <div className={`absolute w-64 h-64 rounded-[50%_50%_45%_55%] border transition-all duration-700 animate-[spin_18s_linear_infinite_reverse] ${
                      agentState === 'speaking' ? 'border-teal-400/10' : 'border-white/5'
                    }`} />
                    <div className={`absolute w-56 h-56 rounded-[48%_52%_55%_45%] border transition-all duration-700 animate-[spin_10s_linear_infinite] ${
                      agentState === 'speaking' ? 'border-teal-400/20' : 'border-white/10'
                    }`} />
                    
                    {/* Doctor Avatar */}
                    <img 
                      src={avatarSrc} 
                      className="w-48 h-48 object-contain transition-all duration-500 hover:scale-105 z-10" 
                      alt="Aarogyam Voice Assistant" 
                    />
                  </div>

                  {/* Active prompt status labels */}
                  <div className="text-center z-10">
                    <h3 className="text-lg font-black text-slate-100 tracking-tight">{promptHeader}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">{promptSub}</p>
                  </div>

                  {/* Live Conversation Preview (shows last User / Assistant message) */}
                  <div className="mt-8 w-full max-w-xl space-y-3 z-10 px-4">
                    {lastUserMsg && (
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left animate-in slide-in-from-bottom duration-300">
                        <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">You</span>
                        <p className="text-sm text-slate-200 mt-1 font-medium italic font-semibold">"{lastUserMsg.message}"</p>
                      </div>
                    )}
                    {lastAssistantMsg && (
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left animate-in slide-in-from-bottom duration-300">
                        <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase">Aarogyam</span>
                        <p className="text-sm text-slate-100 mt-1 font-medium leading-relaxed font-semibold">"{lastAssistantMsg.message}"</p>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* Chat logs panel in futuristic theme */
                <div className="w-full flex-1 flex flex-col justify-between max-h-[380px] bg-black/10 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [scrollbar-width:thin]">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <MessageSquare className="h-10 w-10 text-slate-700 mb-2" />
                        <p className="text-xs font-bold">No chat transcripts yet</p>
                      </div>
                    ) : (
                      messages.map((msg: any, index: number) => (
                        <div
                          key={msg.id || index}
                          className={`flex flex-col max-w-[85%] ${
                            msg.from?.isLocal ? 'ml-auto items-end' : 'mr-auto items-start'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                            {msg.from?.isLocal ? 'You' : 'Aarogyam'}
                          </span>
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-md leading-relaxed ${
                              msg.from?.isLocal
                                ? 'bg-slate-800 text-slate-100 rounded-tr-none border border-slate-700/50'
                                : 'bg-emerald-600 text-white rounded-tl-none'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendText} className="p-3 border-t border-white/5 bg-black/20 flex gap-2">
                    <input
                      type="text"
                      value={textMessage}
                      onChange={(e) => setTextMessage(e.target.value)}
                      placeholder="Type a message to Aarogyam..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 focus:border-emerald-500 focus:outline-none transition text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={!textMessage.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-40"
                    >
                      <HeartPulse className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}

            </div>

            {/* Bottom session layout indicators */}
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/5 pt-5 mt-4 shrink-0">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-slate-400">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                {language || 'English'}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-slate-400">
                <Brain className="w-3.5 h-3.5 text-slate-500" />
                Memory On
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-slate-400">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                Privacy Protected
              </span>
              {isConnected && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-slate-400">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  {formatDuration(sessionDuration)}
                </span>
              )}
            </div>

          </div>

          {/* RIGHT: Aarogyam Companion side panel */}
          <div className="space-y-6 flex flex-col justify-start">
            
            {/* Card 1: Companion header */}
            <div className="bg-[#0F1424]/30 border border-white/5 rounded-3xl p-5 backdrop-blur-xl">
              <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2 border-b border-white/5 pb-3 mb-3 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Aarogyam Companion
              </h3>
              <p className="text-xs text-slate-300 leading-normal font-semibold">How can I help you today?</p>
              
              {/* Quick Action triggers */}
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <button
                  onClick={() => onNavigateTab && onNavigateTab('services')}
                  className="flex items-center justify-start gap-2 p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition text-left text-[11px] font-bold text-slate-300 cursor-pointer"
                >
                  <BriefcaseMedical className="w-3.5 h-3.5 text-teal-400" />
                  Find Clinics
                </button>
                <button
                  onClick={() => onNavigateTab && onNavigateTab('tips')}
                  className="flex items-center justify-start gap-2 p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition text-left text-[11px] font-bold text-slate-300 cursor-pointer"
                >
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  Wellness Tips
                </button>
                <button
                  onClick={() => alert("Triage symptoms helper: Aarogyam voice assistant is active. Speak clearly to outline symptoms, or visit Settings to update profile details.")}
                  className="flex items-center justify-start gap-2 p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition text-left text-[11px] font-bold text-slate-300 cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  Symptoms Guide
                </button>
                <button
                  onClick={() => onNavigateTab && onNavigateTab('escalations')}
                  className="flex items-center justify-start gap-2 p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition text-left text-[11px] font-bold text-slate-300 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Human Help
                </button>
              </div>
            </div>

            {/* Card 2: Your Session details */}
            <div className="bg-[#0F1424]/30 border border-white/5 rounded-3xl p-5 backdrop-blur-xl">
              <h3 className="text-xs font-black text-slate-300 flex items-center gap-2 border-b border-white/5 pb-3 mb-3 uppercase tracking-wider">
                <Info className="w-4 h-4" />
                Your Session
              </h3>
              <div className="space-y-2.5 text-xs font-bold text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Language</span>
                  <span className="text-slate-200">{language || 'English'}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                  <span>Memory</span>
                  <span className="text-emerald-400 flex items-center gap-1">On</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                  <span>Session Duration</span>
                  <span className="text-slate-200 font-mono">{formatDuration(sessionDuration)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                  <span>Connection</span>
                  <span className="text-emerald-400">Excellent</span>
                </div>
              </div>
            </div>

            {/* Card 3: Quick Tip */}
            <div className="bg-[#0F1424]/30 border border-white/5 rounded-3xl p-5 backdrop-blur-xl">
              <h3 className="text-xs font-black text-teal-400 flex items-center gap-2 border-b border-white/5 pb-3 mb-3 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Quick Tip
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                Speak naturally. You can switch between Hindi, Hinglish, and English anytime.
              </p>
            </div>

          </div>

        </div>

        {/* BOTTOM CONTROLS & EVENT PANEL */}
        <footer className="bg-[#0F1424]/20 border-t border-white/5 p-6 backdrop-blur-md z-30 shrink-0">
          
          {isCallEnded ? (
            /* Call Ended Complete View overlay */
            <div className="max-w-xl mx-auto flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom duration-300">
              <h4 className="text-base font-black text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Conversation Completed
              </h4>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                Call analytics and your conversation details have been updated safely.
              </p>
              <div className="flex gap-4 mt-4 w-full">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 py-3 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={startSession}
                  className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/10 transition cursor-pointer"
                >
                  Start Another Conversation
                </button>
              </div>
            </div>
          ) : (
            /* Active Call Controls panel */
            <div className="max-w-md mx-auto flex items-center justify-between gap-4">
              
              {/* Type Toggle button */}
              <button
                onClick={() => setMode(mode === 'voice' ? 'chat' : 'voice')}
                className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer border ${
                  mode === 'chat'
                    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                    : 'text-slate-400 border-transparent hover:bg-white/5'
                }`}
              >
                <Keyboard className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-black tracking-wider uppercase">Type</span>
              </button>

              {/* End/Start Call prominent toggle */}
              {!hasStarted ? (
                <button
                  onClick={startSession}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-3 text-xs font-black shadow-md shadow-emerald-500/20 transition hover:scale-102 cursor-pointer"
                >
                  <Mic className="w-4 h-4 animate-pulse" />
                  Start Call
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 text-xs font-black shadow-md shadow-rose-600/25 transition hover:scale-[1.02] cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call
                </button>
              )}

              {/* Chat mode Toggle button */}
              <button
                onClick={() => setMode(mode === 'chat' ? 'voice' : 'chat')}
                className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer border ${
                  mode === 'chat'
                    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                    : 'text-slate-400 border-transparent hover:bg-white/5'
                }`}
              >
                <MessageSquare className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-black tracking-wider uppercase">Chat Mode</span>
              </button>

            </div>
          )}

        </footer>
      </div>
    );
  }

  // 1. STATE: READY (Not started yet)
  if (!isEmbedded && !hasStarted) {
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
            {/* Doctor Avatar */}
            <img 
              src="/avatar/doctor-ready.png" 
              className="w-48 h-48 object-contain transition-all duration-500 z-10" 
              alt="Aarogyam Voice Assistant Ready" 
            />
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
  if (!isEmbedded && showConnecting) {
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
            {/* Doctor Avatar */}
            <img 
              src="/avatar/doctor-checking.png" 
              className="w-48 h-48 object-contain transition-all duration-500 z-10" 
              alt="Aarogyam Voice Assistant Connecting" 
            />
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
  if (!isEmbedded && hasStarted && micState === 'denied') {
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
  if (!isEmbedded && hasStarted && connectionFailed) {
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
  if (!isEmbedded && isCallEnded) {
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
            {/* Doctor Avatar */}
            <img 
              src="/avatar/doctor-completed.png" 
              className="w-48 h-48 object-contain transition-all duration-500 z-10" 
              alt="Aarogyam Voice Assistant Completed" 
            />
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

  // Dynamic layouts for embedded mode
  if (isEmbedded) {
    let badgeColor = 'bg-slate-100 text-slate-500';
    let statusText = 'Offline';
    let pulseClass = '';

    if (isConnecting) {
      badgeColor = 'bg-blue-50 text-blue-600 border border-blue-100';
      statusText = 'Connecting';
      pulseClass = 'animate-pulse';
    } else if (isConnected) {
      if (agentState === 'speaking') {
        badgeColor = 'bg-blue-50 text-blue-600 border border-blue-100';
        statusText = 'Speaking';
        pulseClass = 'animate-pulse-slow';
      } else if (agentState === 'thinking') {
        badgeColor = 'bg-amber-50 text-amber-600 border border-amber-100';
        statusText = 'Thinking';
        pulseClass = 'animate-pulse';
      } else if (isUserSpeaking) {
        badgeColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        statusText = 'Listening';
        pulseClass = 'animate-pulse-fast';
      } else {
        badgeColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        statusText = 'Listening';
        pulseClass = 'animate-pulse';
      }
    } else if (isCallEnded) {
      badgeColor = 'bg-slate-100 text-slate-500 border border-slate-200';
      statusText = 'Ended';
    } else if (connectError || micState === 'denied') {
      badgeColor = 'bg-rose-50 text-rose-600 border border-rose-100';
      statusText = 'Error';
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.0fr] gap-6 items-start w-full max-w-[1200px] mx-auto min-h-0 select-none pb-6">
        {/* LEFT COLUMN: Main Voice Assistant Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs flex flex-col justify-between h-[580px]">
          {/* Top Section */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-wider text-emerald-600 uppercase flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                Voice Assistant
              </span>
              <h2 className="text-xl font-bold text-slate-800">Talk to Aarogyam</h2>
              <p className="text-xs text-slate-400 font-semibold max-w-md mt-0.5 leading-snug">
                Speak naturally in English, Hindi, or Hinglish. I'm here to help with your health.
              </p>
            </div>
            
            {/* Status Badge */}
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                statusText === 'Listening' ? 'bg-emerald-500' :
                statusText === 'Speaking' ? 'bg-blue-500' :
                statusText === 'Thinking' ? 'bg-amber-500' :
                statusText === 'Connecting' ? 'bg-cyan-500' :
                statusText === 'Error' ? 'bg-rose-500' : 'bg-slate-400'
              } ${pulseClass}`} />
              {statusText}
            </div>
          </div>

          {/* Center Voice/Chat Area */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-0 relative">
            {mode === 'voice' ? (
              // Voice Visualizer Mode
              <div className="flex flex-col items-center justify-center space-y-6 w-full">
                {/* Glowing Rings and Circular Mic Visualizer */}
                <div className="relative flex items-center justify-center h-48 w-48 shrink-0">
                  {/* Glowing Rings */}
                  <div className={`absolute w-44 h-44 rounded-full border transition-all duration-700 ${
                    agentState === 'speaking' ? 'border-blue-500/10 animate-pulse-ring' :
                    isUserSpeaking ? 'border-emerald-400/20 animate-pulse-ring-fast' : 'border-slate-100'
                  }`} />
                  <div className={`absolute w-36 h-36 rounded-full border transition-all duration-700 ${
                    agentState === 'speaking' ? 'border-blue-500/20 animate-pulse-ring-fast' :
                    isUserSpeaking ? 'border-emerald-400/35 animate-pulse-ring-fast' : 'border-slate-50'
                  }`} />

                  {/* Core Circular Button/Orb */}
                  <button
                    onClick={!hasStarted || isCallEnded ? startSession : toggleMute}
                    disabled={isConnecting}
                    className="w-32 h-32 hover:scale-105 transition-transform duration-300 cursor-pointer flex items-center justify-center z-10 focus:outline-hidden"
                  >
                    <img 
                      src={avatarSrc} 
                      className="w-32 h-32 object-contain" 
                      alt="Aarogyam Voice Assistant" 
                    />
                  </button>
                </div>

                {/* Embedded Mode Waveform */}
                {(agentState === 'speaking' || isUserSpeaking) && (
                  <div className="flex items-end justify-center gap-1.5 h-6 mt-2 animate-in fade-in duration-300">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-[#10B981] rounded-full animate-waveform"
                        style={{
                          height: '100%',
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Subtitle / Interaction text */}
                <div className="text-center space-y-2 max-w-md px-4 shrink-0">
                  <h3 className="text-lg font-bold text-slate-800 leading-none">
                    {!hasStarted ? "Aarogyam is ready" :
                     isConnecting ? "Connecting..." :
                     connectError ? "Connection Error" :
                     micState === 'denied' ? "Microphone Blocked" :
                     isCallEnded ? "Call Ended" :
                     agentState === 'speaking' ? "Aarogyam is speaking" :
                     agentState === 'thinking' ? "Thinking..." :
                     isUserSpeaking ? "I'm listening..." : "I'm listening..."}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    {!hasStarted ? "Click the microphone button to start the call" :
                     isConnecting ? "Please wait while we connect your call" :
                     connectError ? "Failed to connect to Aarogyam" :
                     micState === 'denied' ? "Please allow microphone access in settings" :
                     isCallEnded ? "Click below to restart the session" :
                     agentState === 'speaking' ? (latestMessage ? `"${latestMessage.message}"` : "Responding to your query") :
                     agentState === 'thinking' ? "Synthesizing safe medical response" :
                     isUserSpeaking ? (latestMessage ? `"${latestMessage.message}"` : "You can speak now") : "You can speak now"}
                  </p>
                </div>
              </div>
            ) : (
              // Chat Feed Mode
              <div className="w-full h-full flex flex-col min-h-0 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin]">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                      <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-bold text-xs">No chat transcripts yet</p>
                      <p className="text-[10px] mt-0.5">Start speaking or type a message below</p>
                    </div>
                  ) : (
                    messages.map((msg: any, index: number) => (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[85%] ${
                          msg.from?.isLocal ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                          {msg.from?.isLocal ? 'You' : 'Aarogyam'}
                        </span>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-2xs leading-relaxed ${
                            msg.from?.isLocal
                              ? 'bg-slate-900 text-slate-100 rounded-tr-none'
                              : 'bg-emerald-500 text-white rounded-tl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))
                  )}
                  {agentState === 'thinking' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mr-auto p-1 bg-white border rounded-full animate-pulse px-3">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                      Aarogyam is thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Inline Text Message Input Form */}
                <form onSubmit={handleSendText} className="p-3 border-t border-slate-100 bg-white flex gap-2">
                  <input
                    type="text"
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    placeholder="Type a message to Aarogyam..."
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-xs font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={!textMessage.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#059669] hover:bg-[#047857] text-white transition disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Session Badges */}
          <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-50">
            <span className="flex items-center gap-1 px-3 py-1 rounded-full border border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              {language || 'English'}
            </span>
            <span className="flex items-center gap-1 px-3 py-1 rounded-full border border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500">
              <Brain className="w-3.5 h-3.5 text-slate-400" />
              Memory On
            </span>
            <span className="flex items-center gap-1 px-3 py-1 rounded-full border border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              Safe & Private
            </span>
          </div>

          {/* Bottom Controls */}
          <div className="bg-[#FAFBFB] rounded-2xl p-4 flex items-center justify-between border border-slate-100/50 shrink-0">
            {/* Type Toggle Button */}
            <button
              onClick={() => {
                setMode(mode === 'voice' ? 'chat' : 'voice');
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition cursor-pointer ${
                mode === 'chat' ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Keyboard className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-bold">Type</span>
            </button>

            {/* End Call / Start Call Button */}
            {!hasStarted || isCallEnded ? (
              <button
                onClick={startSession}
                className="flex items-center gap-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white px-6 py-2.5 text-xs font-black shadow-md shadow-emerald-500/25 transition hover:scale-102 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                Start Call
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 text-xs font-black shadow-md shadow-rose-600/25 transition hover:scale-102 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </button>
            )}

            {/* Chat Mode Toggle Button */}
            <button
              onClick={() => {
                setMode(mode === 'chat' ? 'voice' : 'chat');
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition cursor-pointer ${
                mode === 'chat' ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-bold">Chat Mode</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Supporting Cards */}
        <div className="space-y-6 flex flex-col justify-start">
          {/* Card 1: Aarogyam Tips */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs">
            <h3 className="text-xs font-extrabold text-[#059669] flex items-center gap-2 border-b border-slate-50 pb-3 mb-3">
              <Sparkles className="w-4 h-4" />
              Aarogyam Tips
            </h3>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-xs font-semibold text-slate-500 leading-normal">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                Speak clearly for better understanding
              </li>
              <li className="flex items-start gap-2.5 text-xs font-semibold text-slate-500 leading-normal">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                You can switch between languages
              </li>
              <li className="flex items-start gap-2.5 text-xs font-semibold text-slate-500 leading-normal">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                All conversations are private and secure
              </li>
              <li className="flex items-start gap-2.5 text-xs font-semibold text-slate-500 leading-normal">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                I can help with symptoms, clinics, and wellness
              </li>
            </ul>
          </div>

          {/* Card 2: Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs">
            <h3 className="text-xs font-extrabold text-blue-600 flex items-center gap-2 border-b border-slate-50 pb-3 mb-3">
              <Activity className="w-4 h-4" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigateTab && onNavigateTab('services')}
                className="flex items-center justify-start gap-2 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition text-left text-xs font-bold text-slate-700 bg-[#FCFDFE] cursor-pointer"
              >
                <BriefcaseMedical className="w-4 h-4 text-emerald-500 shrink-0" />
                Find Clinics
              </button>
              <button
                onClick={() => onNavigateTab && onNavigateTab('tips')}
                className="flex items-center justify-start gap-2 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition text-left text-xs font-bold text-slate-700 bg-[#FCFDFE] cursor-pointer"
              >
                <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />
                Health Tips
              </button>
              <button
                onClick={() => alert("Aarogyam AI: Speak naturally to describe your symptoms. For serious chest pain, breathing difficulty, or high fever, seek emergency hospital care immediately.")}
                className="flex items-center justify-start gap-2 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition text-left text-xs font-bold text-slate-700 bg-[#FCFDFE] cursor-pointer"
              >
                <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                Symptoms Guide
              </button>
              <button
                onClick={() => onNavigateTab && onNavigateTab('escalations')}
                className="flex items-center justify-start gap-2 p-3 rounded-2xl border border-slate-100 hover:bg-[#FFF5F5] hover:border-red-200 transition text-left text-xs font-bold text-red-600 bg-[#FFFDFD] cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                Emergency Help
              </button>
            </div>
          </div>

          {/* Card 3: Session Info */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs">
            <h3 className="text-xs font-extrabold text-slate-500 flex items-center gap-2 border-b border-slate-50 pb-3 mb-3">
              <Info className="w-4 h-4" />
              Session Info
            </h3>
            <div className="space-y-3 text-xs font-bold text-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Session ID</span>
                <span className="font-mono text-[10px] text-slate-700 flex items-center gap-1">
                  {session.room?.name ? `${session.room.name.substring(0, 8)}...` : 'Not active'}
                  {session.room?.name && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(session.room.name);
                        alert('Session ID copied to clipboard!');
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-50 pt-2.5">
                <span className="text-slate-400">Started At</span>
                <span className="text-slate-700">{sessionStartTime || 'Not active'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-50 pt-2.5">
                <span className="text-slate-400">Duration</span>
                <span className="text-slate-700 font-mono">{formatDuration(sessionDuration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Privacy Notice banner centered */}
        <div className="lg:col-span-2 text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1.5 pt-4">
          <Lock className="w-3.5 h-3.5 text-slate-300" />
          Aarogyam AI may make mistakes. Please verify important information.
        </div>
      </div>
    );
  }

  // 3 & 4. STATES: LISTENING & SPEAKING (Active session view for non-embedded layout)
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
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
              aria-label="Close Assistant"
            >
              <X className="h-5 w-5" />
            </button>
          )}
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
              
              {/* Doctor Avatar */}
              <img 
                src={avatarSrc} 
                className="w-56 h-56 object-contain transition-all duration-500 hover:scale-105 z-10" 
                alt="Aarogyam Voice Assistant" 
              />
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
                      animationDelay: `${i * 0.15}s`,
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

export function AarogyamVoiceOverlay({ onClose, isEmbedded = false, onNavigateTab }: AarogyamVoiceOverlayProps) {
  const tokenSource = useMemo(() => {
    if (typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string') {
      return getSandboxTokenSource(APP_CONFIG_DEFAULTS);
    }
    return TokenSource.custom(async () => {
      const storedUser = localStorage.getItem('aarogyam_user');
      const userObj = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userObj?.email || `anonymous_${Math.floor(Math.random() * 10000)}`,
          userName: userObj?.name || 'Guest',
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to fetch connection details');
      }
      return await res.json();
    });
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
      <InnerVoiceOverlay onClose={onClose} isEmbedded={isEmbedded} onNavigateTab={onNavigateTab} />
      <RoomAudioRenderer />
    </AgentSessionProvider>
  );
}
