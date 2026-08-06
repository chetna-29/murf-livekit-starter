'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/app/providers';

export default function SignUpPage() {
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email) {
      setError('Name and Email are required');
      return;
    }

    setLoading(true);
    try {
      const success = await signup(name, email);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('This email is already registered. Please sign in instead.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_34%),radial-gradient(circle_at_85%_20%,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(135deg,_#f8fafc_0%,_#fefefe_100%)] text-slate-900">
      {/* Header Logo */}
      <Link href="/" className="flex items-center gap-3 mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/20">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-slate-900">Aarogyam</p>
          <p className="text-xs text-slate-500">Voice Health Companion</p>
        </div>
      </Link>

      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-[0_20px_90px_-35px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 text-center">
          Sign Up
        </h2>
        <p className="text-sm text-slate-500 mt-2 text-center">
          Create an account to start speaking with Aarogyam
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:scale-[1.02] hover:shadow-emerald-500/35 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign Up
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/signin" className="text-emerald-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
