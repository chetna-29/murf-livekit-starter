'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  HeartPulse,
  LogOut,
  Mic,
  Calendar,
  User as UserIcon,
  Trash2,
  ChevronRight,
  Globe2,
  ChevronDown,
  MessageSquare,
  X
} from 'lucide-react';
import { useAuth } from '@/components/app/providers';
import { useLanguage, Language } from '@/components/app/providers';
import { AarogyamVoiceOverlay } from '@/components/app/aarogyam-voice-overlay';

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface ConversationItem {
  id: string;
  date: string;
  timestamp: number;
  messages: MessageItem[];
  summary?: string;
}

function DashboardContent() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (searchParams && searchParams.get('voice') === 'true') {
      setIsVoiceOpen(true);
      // Clean query parameter from URL
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aarogyam_conversations');
      if (stored) {
        try {
          setConversations(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse conversations', e);
        }
      }
    }
  }, []);

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    localStorage.setItem('aarogyam_conversations', JSON.stringify(updated));
    if (selectedConversation?.id === id) {
      setSelectedConversation(null);
    }
  };

  const selectConversation = (conv: ConversationItem) => {
    setSelectedConversation(conv);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const languagesList: Language[] = [
    'English',
    'हिन्दी',
    'বাংলা',
    'தமிழ்',
    'తెలుగు',
    'ગુજરાતી',
    'ಕನ್ನಡ',
    'മലയാളം',
    'मराठी',
    'ਪੰਜਾਬੀ',
    'ଓଡ଼ିଆ',
    'অসমীয়া',
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_30%),radial-gradient(circle_at_85%_20%,_rgba(37,99,235,0.08),_transparent_24%),linear-gradient(135deg,_#f8fafc_0%,_#fefefe_100%)] text-slate-900 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">Aarogyam</p>
              <p className="text-xs text-slate-500">Dashboard</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <details className="group relative">
              <summary
                aria-label="Choose language"
                className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
              >
                <Globe2 className="h-4 w-4 text-slate-500" />
                <span>{language}</span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                {languagesList.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setLanguage(lang);
                    }}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 hover:text-slate-900 ${
                      language === lang ? 'font-semibold text-emerald-600 bg-emerald-50/50' : 'text-slate-600'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </details>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.8fr]">
          {/* Left panel: Actions & Profile */}
          <div className="space-y-6">
            {/* Talk to Aarogyam Call Card */}
            <div className="relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white shadow-xl shadow-emerald-500/20">
              <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 opacity-10">
                <Mic className="h-64 w-64" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Speak to Aarogyam</h2>
              <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
                Connect instantly with your AI Voice Health Companion. Discuss symptoms, health guidelines, or wellness tips in your preferred language.
              </p>
              <button
                onClick={() => setIsVoiceOpen(true)}
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white py-4 text-base font-semibold text-emerald-700 shadow-md transition hover:scale-[1.02] hover:bg-emerald-50 cursor-pointer"
              >
                <Mic className="h-5 w-5" />
                Talk to Aarogyam
              </button>
            </div>

            {/* Profile Panel */}
            <div className="rounded-[2.0rem] border border-white/70 bg-white/70 p-6 shadow-md backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-3 mb-4">
                User Profile
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Name
                    </p>
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <span className="text-sm font-bold">@</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-slate-800">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Member Since
                    </p>
                    <p className="text-sm font-semibold text-slate-800">{user.joinedDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: History */}
          <div className="space-y-6">
            <div className="rounded-[2.0rem] border border-white/70 bg-white/70 p-6 shadow-md backdrop-blur-xl min-h-[400px] flex flex-col">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-3 mb-4 flex items-center justify-between">
                <span>{t('history')}</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-mono">
                  {conversations.length} total
                </span>
              </h3>

              {conversations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No conversation history found.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Start a new conversation with Aarogyam to see your history here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`group flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition-all hover:bg-white cursor-pointer hover:shadow-sm ${
                        selectedConversation?.id === conv.id ? 'bg-white border-emerald-200 ring-1 ring-emerald-200' : 'bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 text-emerald-600">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-400 font-medium">{conv.date}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate pr-4">
                            {conv.summary || 'Voice Consultation'}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {conv.messages.length} messages
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-100 transition shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete History"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Transcript Detail Drawer / Modal overlay */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedConversation.summary || 'Voice Consultation'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedConversation.date}</p>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {selectedConversation.messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                    {msg.sender === 'user' ? 'You' : 'Aarogyam'}
                  </p>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-slate-950 text-slate-100 rounded-tr-none'
                        : 'bg-emerald-500 text-white rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t p-6 flex justify-end gap-3 bg-white">
              <button
                onClick={(e) => {
                  handleDeleteConversation(selectedConversation.id, e);
                }}
                className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 className="h-4 w-4" />
                Delete Transcript
              </button>
              <button
                onClick={() => setSelectedConversation(null)}
                className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isVoiceOpen && (
        <AarogyamVoiceOverlay
          onClose={() => {
            setIsVoiceOpen(false);
            // Refresh conversation history
            const stored = localStorage.getItem('aarogyam_conversations');
            if (stored) {
              try {
                setConversations(JSON.parse(stored));
              } catch (e) {
                console.error(e);
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
