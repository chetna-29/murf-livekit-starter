'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/app/providers';
import { HeartPulse } from 'lucide-react';
import { AarogyamVoiceOverlay } from '@/components/app/aarogyam-voice-overlay';

export default function TalkToAarogyamSessionPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
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
          <span className="text-sm text-slate-400 font-semibold">Loading voice companion studio...</span>
        </div>
      </div>
    );
  }

  return (
    <AarogyamVoiceOverlay
      isEmbedded={false}
      isFuturistic={true}
      autoStart={true}
      onClose={() => router.push('/dashboard')}
      onNavigateTab={(tabName) => router.push(`/dashboard?tab=${tabName}`)}
    />
  );
}
