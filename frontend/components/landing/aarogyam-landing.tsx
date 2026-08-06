'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  Globe2,
  HeartPulse,
  Mic,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useAuth, useLanguage } from '@/components/app/providers';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#cta' },
];

const languages = ['English', 'हिन्दी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'ગુજરાતી', 'ಕನ್ನಡ', 'മലയാളം', 'मराठी', 'ਪੰਜਾਬੀ', 'ଓଡ଼ିଆ', 'অসমীয়া'];

const trustItems = [
  {
    icon: ShieldCheck,
    title: 'Privacy First',
    description: 'Secure by design, with calm, trustworthy interactions at every step.',
  },
  {
    icon: Globe2,
    title: 'Built for Bharat',
    description: 'Multilingual support designed to feel local, respectful, and inclusive.',
  },
  {
    icon: Mic,
    title: 'Voice First',
    description: 'A seamless voice experience that makes care feel natural and effortless.',
  },
  {
    icon: Zap,
    title: 'Real-Time AI',
    description: 'Instantly responsive guidance that feels fast, polished, and human.',
  },
];

const steps = [
  {
    icon: Mic,
    title: 'Speak Naturally',
    description: 'Start with a simple voice prompt and describe what matters to you.',
  },
  {
    icon: Brain,
    title: 'AI Understands',
    description: 'Aarogyam listens, brings context together, and adapts to your needs.',
  },
  {
    icon: HeartPulse,
    title: 'Get Helpful Guidance',
    description: 'Receive safe, friendly health guidance and next-step support.',
  },
];

const featureCards = [
  {
    icon: Bot,
    title: 'Voice First',
    description: 'Natural conversations that feel calm, effortless, and intuitive.',
  },
  {
    icon: Globe2,
    title: 'Indian Languages',
    description: 'Multilingual support that feels local, inclusive, and familiar.',
  },
  {
    icon: Brain,
    title: 'AI Powered',
    description: 'Context-aware intelligence that helps people move forward with clarity.',
  },
  {
    icon: HeartPulse,
    title: 'Fast Responses',
    description: 'Helpful guidance that arrives quickly without sacrificing warmth.',
  },
];

const featureList = [
  'Voice First',
  'Indian Languages',
  'AI Powered',
  'Fast Responses',
  'Friendly Conversations',
  'Healthcare Guidance',
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg text-slate-600">{description}</p>
    </div>
  );
}

function GlassCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="group rounded-[1.75rem] border border-white/70 bg-white/75 p-6 shadow-[0_20px_90px_-35px_rgba(15,23,42,0.35)] backdrop-blur-xl"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </motion.article>
  );
}

function LanguageSelector() {
  const { language: currentLang, setLanguage } = useLanguage();
  return (
    <details className="group relative hidden md:block">
      <summary
        aria-label="Choose language"
        className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
      >
        <Globe2 className="h-4 w-4" />
        <span>{currentLang}</span>
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        {languages.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang as any)}
            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 hover:text-slate-900 ${
              currentLang === lang ? 'font-semibold text-emerald-600' : 'text-slate-600'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>
    </details>
  );
}

export function AarogyamLanding() {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      router.push('/dashboard?voice=true');
    } else {
      router.push('/signin');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_34%),radial-gradient(circle_at_85%_20%,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(135deg,_#f8fafc_0%,_#fefefe_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="Aarogyam home">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">Aarogyam</p>
              <p className="text-xs text-slate-500">Voice Health Companion</p>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex" aria-label="Main navigation">
            <a href="#home" className="transition hover:text-emerald-600">{t('home')}</a>
            <a href="#features" className="transition hover:text-emerald-600">{t('features')}</a>
            <a href="#how-it-works" className="transition hover:text-emerald-600">{t('howItWorksNav')}</a>
            <a href="#about" className="transition hover:text-emerald-600">{t('about')}</a>
            <a href="#cta" className="transition hover:text-emerald-600">{t('contact')}</a>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            {isAuthenticated ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:block"
              >
                {t('dashboard')}
              </button>
            ) : (
              <button
                onClick={() => router.push('/signin')}
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:block"
              >
                {t('signIn')}
              </button>
            )}
            <button
              onClick={handleCtaClick}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:scale-[1.02] hover:shadow-emerald-500/35"
            >
              {t('getStarted')}
            </button>
          </div>
        </div>
      </header>

      <main id="home">
        <section className="relative overflow-hidden px-6 py-20 sm:py-24 lg:px-8 lg:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,_rgba(16,185,129,0.14),_transparent_30%),radial-gradient(circle_at_80%_0%,_rgba(37,99,235,0.16),_transparent_28%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                {t('premiumAi')}
              </motion.div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">
                {t('titlePart1')}
                <span className="mt-2 block text-transparent bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text">
                  {t('titlePart2')}
                </span>
              </h1>
              <p className="mt-5 text-xl font-medium text-emerald-600 sm:text-2xl">
                {t('subtitle')}
              </p>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                {t('description')}
              </p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-8 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_20px_90px_-35px_rgba(15,23,42,0.35)] backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="flex gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    </div>
                    <span>{t('listening')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <motion.span
                        key={index}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.15 }}
                        className="h-1.5 w-5 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500"
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-slate-950/95 p-4 text-sm text-slate-100">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{t('user')}</p>
                    <p className="mt-1">{t('userQuote')}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-slate-700">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-600">{t('aarogyam')}</p>
                    <div className="mt-2 flex items-start gap-2">
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                        className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"
                      />
                      <p>
                        {t('aarogyamResponse')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleCtaClick}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:scale-[1.02] hover:shadow-emerald-500/35 cursor-pointer"
                >
                  <Mic className="h-5 w-5" />
                  {t('talkToAarogyam')}
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                >
                  {t('learnMore')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="relative mx-auto flex w-full max-w-xl items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 via-white/0 to-blue-400/30 blur-3xl" />
              <motion.div
                animate={{ y: [0, -10, 0], scale: [1, 1.02, 1], rotate: [0, 3, 0] }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className="relative flex h-[320px] w-[320px] items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-emerald-500 via-emerald-400 to-blue-500 shadow-[0_35px_140px_-30px_rgba(16,185,129,0.7)] sm:h-[380px] sm:w-[380px]"
              >
                <motion.div
                  animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute inset-0 rounded-full border border-white/30"
                />
                <motion.div
                  animate={{ scale: [1, 1.14, 1], opacity: [0.3, 0.55, 0.3] }}
                  transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute inset-6 rounded-full border border-white/25"
                />
                <motion.div
                  animate={{ scale: [1.02, 1.18, 1.02], opacity: [0.2, 0.35, 0.2] }}
                  transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute inset-12 rounded-full border border-white/20"
                />
                <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.35),_transparent_65%)]" />
                <div className="flex flex-col items-center justify-center text-center text-white">
                  <div className="mb-4 rounded-3xl bg-white/20 p-3 backdrop-blur">
                    <Bot className="h-10 w-10" />
                  </div>
                  <p className="text-lg font-semibold">Aarogyam AI</p>
                  <p className="mt-2 text-sm text-emerald-50">Listening carefully</p>
                </div>
                <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-end gap-2">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <motion.div
                      key={index}
                      animate={{ height: [10, 34, 10] }}
                      transition={{
                        duration: 1.2 + index * 0.1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'easeInOut',
                      }}
                      className="w-2 rounded-full bg-white/80"
                    />
                  ))}
                </div>
                {Array.from({ length: 8 }).map((_, index) => (
                  <motion.span
                    key={index}
                    animate={{
                      x: [0, Math.cos((index / 8) * Math.PI * 2) * 90, 0],
                      y: [0, Math.sin((index / 8) * Math.PI * 2) * 90, 0],
                      opacity: [0.2, 0.8, 0.2],
                    }}
                    transition={{ duration: 3 + index * 0.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                    className="absolute h-2.5 w-2.5 rounded-full bg-white/70"
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="px-6 pb-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
            {trustItems.map((item) => (
              <GlassCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section id="features" className="px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Core capabilities"
              title="A premium intelligence layer for accessible care"
              description="Every interaction is crafted to feel effortless, reassuring, and deeply human."
            />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((item) => (
                <GlassCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200/80 bg-white/75 p-8 shadow-[0_25px_120px_-30px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:p-12 lg:p-16">
            <SectionHeading
              eyebrow="How it works"
              title="Three simple steps to better support"
              description="From a brief voice prompt to helpful health guidance in seconds."
            />
            <div className="relative mt-12 flex flex-col items-center gap-8 lg:flex-row lg:justify-between lg:gap-4">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8 }}
                className="absolute top-1/2 left-0 hidden h-px w-full -translate-y-1/2 origin-left bg-gradient-to-r from-emerald-400/60 via-blue-400/60 to-emerald-400/60 lg:block"
              />
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: index * 0.12 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="relative flex w-full max-w-sm flex-col items-center rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-8 text-center shadow-[0_20px_70px_-35px_rgba(15,23,42,0.3)]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/25">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                  {index < steps.length - 1 ? (
                    <div className="mt-6 flex items-center text-emerald-500 lg:hidden">
                      <Waves className="h-5 w-5" />
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="px-6 py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 rounded-[2rem] border border-slate-200/80 bg-slate-950 p-8 text-white shadow-[0_25px_120px_-30px_rgba(15,23,42,0.45)] sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:p-16">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-emerald-500/30 via-slate-900 to-blue-500/20 p-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_35%)]" />
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                  <MessageCircleMore className="h-8 w-8" />
                </div>
                <div className="mt-6 rounded-[1.5rem] border border-white/15 bg-slate-900/80 p-5 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                    <div className="h-3 w-3 rounded-full bg-blue-400" />
                    <div className="h-3 w-3 rounded-full bg-slate-300" />
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="ml-0 rounded-2xl bg-slate-800/80 px-4 py-3 text-sm text-slate-200">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">You</p>
                      <p className="mt-1">“I’m feeling unusually tired today.”</p>
                    </div>
                    <div className="ml-6 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm text-emerald-100">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-300">Aarogyam</p>
                      <p className="mt-1">
                        “Let’s talk through it gently and look at the next steps together.”
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
                {t('whyAarogyam')}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('voiceFirstSupport')}
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                {t('dignifiedGuidance')}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {featureList.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-emerald-400/40 hover:bg-white/10"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <span className="font-medium text-slate-100">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="cta" className="px-6 py-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-8 shadow-[0_25px_120px_-30px_rgba(16,185,129,0.25)] sm:p-12 lg:p-16"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(16,185,129,0.18),_transparent_30%),radial-gradient(circle_at_80%_0%,_rgba(37,99,235,0.16),_transparent_28%)]" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                  {t('readyToBegin')}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {t('readyToExperience')}
                </h2>
                <p className="mt-4 text-lg text-slate-600">
                  {t('meetCompanion')}
                </p>
              </div>
              <button
                onClick={handleCtaClick}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:scale-[1.02] hover:shadow-emerald-500/35 cursor-pointer"
              >
                <Mic className="h-5 w-5" />
                {t('startTalking')}
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70 px-6 py-10 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm text-slate-600 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Aarogyam</p>
              <p>Made with ❤️ for Bharat</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <a href="#" className="transition hover:text-emerald-600">
              GitHub
            </a>
            <a href="#" className="transition hover:text-emerald-600">
              Privacy
            </a>
            <a href="#" className="transition hover:text-emerald-600">
              Terms
            </a>
            <a href="#" className="transition hover:text-emerald-600">
              Contact
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Powered by
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-700">
              <span className="rounded-full bg-white px-2.5 py-1">Murf Falcon</span>
              <span className="rounded-full bg-white px-2.5 py-1">LiveKit</span>
              <span className="rounded-full bg-white px-2.5 py-1">Gemini</span>
              <span className="rounded-full bg-white px-2.5 py-1">Deepgram</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
