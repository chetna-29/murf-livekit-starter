'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useLanguage } from '@/components/app/providers';
import { HeartPulse, Mic, Shield, Brain, ArrowLeft, Globe2, ChevronDown } from 'lucide-react';

export default function TalkToAarogyamIntroPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070A13] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <HeartPulse className="w-10 h-10 text-emerald-500 animate-pulse" />
          <span className="text-sm text-slate-400 font-semibold">Loading Aarogyam AI...</span>
        </div>
      </div>
    );
  }

  const languagesList = [
    'English',
    'हिन्दी',
    'বাংলা',
    'தமிழ்',
    'తెలుగు',
    'ગુજરાતી',
    'ಕನ್ನಡ',
    'മലയാളം',
    'मराठी',
    'ਪੰਜਾਬী',
    'ଓଡ଼िଆ',
    'অસમীয়া',
  ];

  return (
    <div className="min-h-screen bg-[#070A13] text-white flex flex-col justify-between p-6 relative overflow-hidden font-sans select-none">
      
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="flex justify-between items-center max-w-6xl mx-auto w-full z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-4">
          {/* Active Language Selector */}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition">
              <Globe2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Language: {language}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-white/10 bg-[#0F1424] p-2 shadow-2xl z-50 overflow-y-auto max-h-60">
              {languagesList.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang as any)}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-white/5 ${
                    language === lang ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </details>
        </div>
      </header>

      {/* Main Confirmation Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto z-10 py-10 w-full">
        
        {/* Animated Pulsing Pulse-wave Health Orb */}
        <div className="relative flex items-center justify-center h-48 w-48 mb-8">
          <div className="absolute w-44 h-44 rounded-full border border-emerald-500/10 animate-[spin_20s_linear_infinite] animate-pulse" />
          <div className="absolute w-36 h-36 rounded-full border border-teal-500/5 animate-[spin_12s_linear_infinite_reverse]" />
          
          {/* Glowing Green Orb Core */}
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.3)] animate-pulse">
            <HeartPulse className="h-12 w-12 text-white" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
          Talk to Aarogyam
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-3 max-w-lg font-medium">
          Start a voice conversation with your AI health companion.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-12 w-full max-w-3xl">
          {/* Card 1 */}
          <div className="bg-white/5 border border-white/5 rounded-3xl p-5 backdrop-blur-md hover:border-emerald-500/25 transition duration-300 flex flex-col items-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3.5">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Voice Powered</h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-2 leading-relaxed">
              Speak naturally in Hindi, Hinglish, or English.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 border border-white/5 rounded-3xl p-5 backdrop-blur-md hover:border-emerald-500/25 transition duration-300 flex flex-col items-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3.5">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Safe & Private</h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-2 leading-relaxed">
              Your conversations are private and confidential.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/5 border border-white/5 rounded-3xl p-5 backdrop-blur-md hover:border-emerald-500/25 transition duration-300 flex flex-col items-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3.5">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Always Here</h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-2 leading-relaxed">
              I'm here to support your health and wellness questions.
            </p>
          </div>
        </div>

        {/* Dynamic Buttons confirmation panel */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-md">
          <button
            onClick={() => router.push('/talk-to-aarogyam/session')}
            className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-4 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
          >
            Yes, I want to talk
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 py-4 px-6 text-sm font-bold text-slate-300 hover:text-white transition cursor-pointer"
          >
            Not now, maybe later
          </button>
        </div>

      </div>

      {/* Subtle Footer Privacy Notice */}
      <footer className="text-center text-[10px] text-slate-500 font-semibold z-10">
        Aarogyam AI may make mistakes. Please verify important information.
      </footer>
    </div>
  );
}
