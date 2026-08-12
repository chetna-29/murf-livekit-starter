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
  X,
  LayoutDashboard,
  Bell,
  Leaf,
  Settings,
  Shield,
  Activity,
  Heart,
  FolderHeart,
  BriefcaseMedical,
  ShieldAlert,
  Menu,
  ClipboardList,
  Search,
  Plus,
  Clock,
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle,
  Loader2,
  Lock
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

interface EscalationItem {
  id: string;
  userId: string;
  problemSummary: string;
  checksPerformed: string;
  urgency: string;
  language: string;
  preferredFollowUp: string;
  status: string;
  timestamp: string;
}

interface ReminderItem {
  id: string;
  title: string;
  time: string;
  date: string;
  repeat: 'daily' | 'weekly' | 'none';
  type: 'health' | 'activity' | 'appointment';
  active: boolean;
}

// Sparkline component to render small premium charts matching the dashboard style
const Sparkline = ({ color }: { color: 'green' | 'blue' | 'orange' | 'purple' }) => {
  const points = {
    green: '0,22 15,18 30,24 45,16 60,22 75,14 90,20 100,12',
    blue: '0,25 15,20 30,25 45,18 60,22 75,16 90,22 100,14',
    orange: '0,24 15,26 30,18 45,24 60,16 75,22 90,14 100,20',
    purple: '0,22 15,24 30,16 45,26 60,18 75,22 90,12 100,20'
  }[color];

  const strokeColor = {
    green: '#10B981',
    blue: '#3B82F6',
    orange: '#F97316',
    purple: '#8B5CF6'
  }[color];

  const gradientId = `grad-${color}`;

  return (
    <svg className="w-full h-8 mt-4 shrink-0" viewBox="0 0 100 30" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={`M 0,30 L ${points} L 100,30 Z`} fill={`url(#${gradientId})`} />
      <path
        d={`M ${points.replace(/,/g, ' ')}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Animated waveform visualizer next to Speak button
const WaveformVisualizer = () => {
  return (
    <div className="flex items-center gap-[3px] h-6 px-2 shrink-0">
      {[4, 10, 6, 16, 12, 8, 18, 14, 10, 16, 8, 4, 12, 6, 10].map((height, i) => (
        <div
          key={i}
          className="w-[3px] bg-[#10B981] rounded-full animate-pulse"
          style={{
            height: `${height}px`,
            animationDuration: `${0.8 + (i % 4) * 0.25}s`,
            animationDelay: `${i * 0.04}s`
          }}
        />
      ))}
    </div>
  );
};

// Heartbeat pulse SVG animation for the Escalation Requests card
const HeartPulseGraphic = () => (
  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
    <div className="absolute inset-0 bg-rose-500/10 rounded-full animate-ping opacity-75" />
    <svg className="w-14 h-14 text-rose-500 drop-shadow-sm z-10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      <path
        d="M6,8.5 L8.5,8.5 L9.5,6.5 L11,11 L12.5,7.5 L13.5,9 L15.5,9"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

// Footer banner SVG illustration of a person holding a phone
const FooterIllustration = () => (
  <svg className="w-40 h-28 hidden md:block shrink-0" viewBox="0 0 200 140" fill="none">
    <circle cx="150" cy="80" r="40" fill="#E6F4EA" />
    <circle cx="80" cy="110" r="25" fill="#E3F2FD" />
    
    <path d="M 120,40 C 130,30 140,40 140,50 C 130,60 120,50 120,40 Z" fill="#34A853" opacity="0.7" />
    <path d="M 170,55 C 175,48 182,52 182,58 C 177,65 170,62 170,55 Z" fill="#34A853" opacity="0.5" />
    <path d="M 50,90 C 55,82 65,85 65,95 C 60,102 50,100 50,90 Z" fill="#34A853" opacity="0.6" />

    <rect x="95" y="60" width="22" height="42" rx="4" fill="#374151" transform="rotate(-10 106 81)" />
    <rect x="97" y="62" width="18" height="38" rx="2" fill="#E5E7EB" transform="rotate(-10 106 81)" />
    <rect x="98" y="63" width="16" height="36" rx="1" fill="#10B981" transform="rotate(-10 106 81)" />

    <circle cx="130" cy="90" r="14" fill="#F87171" />
    <path d="M 130,104 C 115,104 110,120 110,140 L 150,140 C 150,120 145,104 130,104 Z" fill="#0D9488" />
    
    <path d="M 112,95 C 105,95 101,98 99,101" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

function DashboardContent() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state driven by query parameter where possible
  const [activeTab, setActiveTab] = useState<'dashboard' | 'talk' | 'history' | 'services' | 'escalations' | 'reminders' | 'tips' | 'profile' | 'settings' | 'privacy'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Core Data Lists
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  
  // Real DB Escalations State
  const [realEscalations, setRealEscalations] = useState<EscalationItem[]>([]);
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationItem | null>(null);
  const [escalationsFilter, setEscalationsFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [isEscalationsLoading, setIsEscalationsLoading] = useState(false);

  // Real DB Memory Profile State
  const [dbProfileFacts, setDbProfileFacts] = useState<string[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Facility Search State
  const [searchLocation, setSearchLocation] = useState('');
  const [facilitiesResults, setFacilitiesResults] = useState<any>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Reminders Local State (Mocked interactively, no fake backend updates)
  const [reminders, setReminders] = useState<ReminderItem[]>([
    { id: 'rem-1', title: 'Daily Step Goal Reminder', time: '08:30 AM', date: 'Daily', repeat: 'daily', type: 'activity', active: true },
    { id: 'rem-2', title: 'Healthcare Check Follow-up', time: '11:00 AM', date: '8/14/2026', repeat: 'none', type: 'health', active: true },
    { id: 'rem-3', title: 'General Fitness Stretch', time: '06:00 PM', date: 'Daily', repeat: 'daily', type: 'activity', active: false }
  ]);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newReminderType, setNewReminderType] = useState<'health' | 'activity' | 'appointment'>('health');
  
  // History Filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'today' | 'week' | 'escalated'>('all');

  // Load Active Tab from search parameters
  useEffect(() => {
    if (searchParams) {
      const tab = searchParams.get('tab');
      if (tab && ['dashboard', 'talk', 'history', 'services', 'escalations', 'reminders', 'tips', 'profile', 'settings', 'privacy'].includes(tab)) {
        setActiveTab(tab as any);
      }
    }
  }, [searchParams]);

  // Load Conversations
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoading && user) {
      const key = `aarogyam_conversations_${user.email.trim().toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          setConversations(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user, isLoading]);

  // Fetch Escalations from actual DB route
  const fetchEscalations = async () => {
    setIsEscalationsLoading(true);
    try {
      const res = await fetch('/api/escalations');
      if (res.ok) {
        const data = await res.json();
        setRealEscalations(data);
      }
    } catch (e) {
      console.error('Failed to fetch escalations', e);
    } finally {
      setIsEscalationsLoading(false);
    }
  };

  // Fetch Profile memory facts from actual DB route
  const fetchProfileMemory = async () => {
    if (!user) return;
    setIsProfileLoading(true);
    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.facts) {
          setDbProfileFacts(data.facts);
        } else {
          setDbProfileFacts([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Trigger loading when activeTab changes
  useEffect(() => {
    if (activeTab === 'escalations' || activeTab === 'dashboard') {
      fetchEscalations();
    }
    if (activeTab === 'profile') {
      fetchProfileMemory();
    }
  }, [activeTab, user]);

  const handleClearSavedMemory = async () => {
    if (!user) return;
    const confirm = window.confirm('Are you sure you want Aarogyam to clear all saved memory facts?');
    if (!confirm) return;

    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDbProfileFacts([]);
        alert('All saved memory facts cleared successfully.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to clear saved memory.');
    }
  };

  const handleSearchHealthcare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchLocation.trim()) return;
    setIsSearchLoading(true);
    setSearchError('');
    setFacilitiesResults(null);

    try {
      const res = await fetch(`/api/healthcare?location=${encodeURIComponent(searchLocation.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Failed to search healthcare services.');
      } else {
        setFacilitiesResults(data);
      }
    } catch (err) {
      setSearchError('A network error occurred. Please try again.');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (user) {
      const key = `aarogyam_conversations_${user.email.trim().toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify(updated));
    }
    if (selectedConversation?.id === id) {
      setSelectedConversation(null);
    }
  };

  // Reminders CRUD Actions (React state only)
  const handleToggleReminder = (id: string) => {
    setReminders(
      reminders.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle || !newReminderTime) return;
    const newRem: ReminderItem = {
      id: `rem-${Date.now()}`,
      title: newReminderTitle,
      time: newReminderTime,
      date: 'Daily',
      repeat: 'daily',
      type: newReminderType,
      active: true,
    };
    setReminders([...reminders, newRem]);
    setNewReminderTitle('');
    setNewReminderTime('');
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter((r) => r.id !== id));
  };

  // Mock conversation history fallback for the UI
  const defaultMockConversations: ConversationItem[] = [
    {
      id: 'mock-1',
      date: '8/12/2026',
      timestamp: Date.now() - 1000 * 60 * 15,
      summary: 'Stay Active Tips',
      messages: [
        { id: '1', sender: 'user', text: 'What are some simple ways I can stay active?', timestamp: Date.now() - 1000 * 60 * 15 },
        { id: '2', sender: 'assistant', text: 'Staying active is easy! You can try walking 30 minutes daily, taking stairs, or stretching. Keep a track of your steps.', timestamp: Date.now() - 1000 * 60 * 14 }
      ]
    },
    {
      id: 'mock-2',
      date: '8/12/2026',
      timestamp: Date.now() - 1000 * 60 * 60 * 2,
      summary: 'Chest Pain Triage',
      messages: [
        { id: '1', sender: 'user', text: 'Chest pain ho raha hai.', timestamp: Date.now() - 1000 * 60 * 60 * 2 },
        { id: '2', sender: 'assistant', text: 'Chest pain is a serious symptom. Please sit down, rest, and visit a doctor. Your Reference ID: ESC-9F4B21. Support ticket is created.', timestamp: Date.now() - 1000 * 60 * 60 * 2 }
      ]
    },
    {
      id: 'mock-3',
      date: '8/10/2026',
      timestamp: Date.now() - 1000 * 60 * 60 * 48,
      summary: 'Dehradun Location Confirmation',
      messages: [
        { id: '1', sender: 'user', text: 'I told you that I live in Dehradun...', timestamp: Date.now() - 1000 * 60 * 60 * 48 },
        { id: '2', sender: 'assistant', text: 'Thank you for confirming. I will remember that you live in Dehradun to locate facilities near you in the future.', timestamp: Date.now() - 1000 * 60 * 60 * 48 }
      ]
    },
    {
      id: 'mock-4',
      date: '8/10/2026',
      timestamp: Date.now() - 1000 * 60 * 60 * 50,
      summary: 'Facility Lookup near me',
      messages: [
        { id: '1', sender: 'user', text: 'Tell me the health care facilities near me...', timestamp: Date.now() - 1000 * 60 * 60 * 50 },
        { id: '2', sender: 'assistant', text: 'Searching facilities in Dehradun based on your profile memory. Found 3 hospitals near you.', timestamp: Date.now() - 1000 * 60 * 60 * 50 }
      ]
    },
    {
      id: 'mock-5',
      date: '8/10/2026',
      timestamp: Date.now() - 1000 * 60 * 60 * 52,
      summary: 'Weight Management Diet',
      messages: [
        { id: '1', sender: 'user', text: 'Best diet plan for weight management?', timestamp: Date.now() - 1000 * 60 * 60 * 52 },
        { id: '2', sender: 'assistant', text: 'A balanced diet rich in protein, fiber, and healthy fats while reducing processed foods is ideal. Regular hydration helps.', timestamp: Date.now() - 1000 * 60 * 60 * 52 }
      ]
    }
  ];

  const allConversations = conversations;
  const displayedConversations = conversations.slice(0, 5);
  const selectConversation = setSelectedConversation;

  // Conversation Filtering
  const filteredConversations = allConversations.filter((c) => {
    if (historyFilter === 'today') {
      const todayStr = new Date().toLocaleDateString();
      return new Date(c.timestamp).toLocaleDateString() === todayStr;
    }
    if (historyFilter === 'week') {
      const oneWeekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
      return c.timestamp > oneWeekAgo;
    }
    if (historyFilter === 'escalated') {
      return c.messages.some((m) => m.sender === 'assistant' && m.text.includes('Reference ID:'));
    }
    return true;
  });

  // Map backend JSON structures to UI values
  const escalationsList: EscalationItem[] = realEscalations.map((e: any) => ({
    id: e.id,
    userId: e.user_id,
    problemSummary: e.problem_summary,
    checksPerformed: e.checks_performed,
    urgency: e.urgency,
    language: e.language,
    preferredFollowUp: e.preferred_follow_up,
    status: e.status || 'open',
    timestamp: e.timestamp
  }));

  // Filter Escalations
  const filteredEscalations = escalationsList.filter((e) => {
    if (escalationsFilter === 'open') return e.status.toLowerCase() === 'open';
    if (escalationsFilter === 'in_progress') return e.status.toLowerCase() === 'in progress' || e.status.toLowerCase() === 'in_progress';
    if (escalationsFilter === 'resolved') return e.status.toLowerCase() === 'resolved';
    return true;
  });

  const activeEscalationsCount = escalationsList.filter(e => e.status.toLowerCase() === 'open').length;

  const navigateToTab = (tabName: typeof activeTab) => {
    setActiveTab(tabName);
    router.push(`/dashboard?tab=${tabName}`);
    setIsSidebarOpen(false);
  };

  const handleWellnessTipClick = (tipTopic: string) => {
    navigateToTab('talk');
    // We can show a small prompt suggestion on the voice screen
    setTimeout(() => {
      alert(`Tip: Aarogyam AI voice assistant is now active. You can speak naturally and ask: "Tell me more about ${tipTopic}"`);
    }, 1200);
  };

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
    'ਪੰਜਾਬী',
    'ଓଡ଼िଆ',
    'অসমীয়া',
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <aside
        className={`w-64 bg-white border-r border-slate-100 flex flex-col h-full shrink-0 z-40 transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0 shadow-2xl' : '-translate-x-full absolute md:relative'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">Aarogyam</p>
              <p className="text-[10px] text-slate-400 font-medium">AI Voice Health Companion</p>
            </div>
          </div>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg md:hidden text-slate-400">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <button
            onClick={() => navigateToTab('dashboard')}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => navigateToTab('talk')}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'talk'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Mic className="h-4 w-4 shrink-0" />
            <span>Talk to Aarogyam</span>
          </button>

          <button
            onClick={() => navigateToTab('history')}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span>History</span>
          </button>

          <button
            onClick={() => navigateToTab('services')}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'services'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <BriefcaseMedical className="h-4 w-4 shrink-0" />
            <span>Health Services</span>
          </button>

          <button
            onClick={() => navigateToTab('escalations')}
            className={`flex w-full items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'escalations'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Escalation Requests</span>
            </div>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {activeEscalationsCount || 1}
            </span>
          </button>

          <button
            onClick={() => navigateToTab('reminders')}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'reminders'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span>Reminders</span>
          </button>

          <button
            onClick={() => navigateToTab('tips')}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'tips'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Leaf className="h-4 w-4 shrink-0" />
            <span>Wellness Tips</span>
          </button>

          <button
            onClick={() => navigateToTab('profile')}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <UserIcon className="h-4 w-4 shrink-0" />
            <span>My Profile</span>
          </button>

          <button
            onClick={() => navigateToTab('settings')}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-50/70 text-emerald-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Sidebar Privacy Center click handler */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => navigateToTab('privacy')}
            className="w-full text-left p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/50 flex items-center gap-3 hover:bg-emerald-100/40 transition cursor-pointer"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/10">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] font-bold text-slate-800 tracking-tight">Your Health. Your Privacy.</h4>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Secure. Private. Confidential.</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-50 rounded-xl md:hidden text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-1.5">
                Welcome back, <span className="text-[#059669]">{user?.name || 'Chetna'}!</span> 👋
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">How can Aarogyam help you today?</p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3">
            {/* Talk Button & Waveform Container */}
            <div className="hidden lg:flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-full py-1.5 pl-4 pr-1.5">
              <WaveformVisualizer />
              <button
                onClick={() => navigateToTab('talk')}
                className="flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/15 transition hover:scale-[1.02] cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Talk to Aarogyam</span>
              </button>
            </div>

            {/* Language Selector Dropdown */}
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-2xs hover:border-emerald-300 hover:text-emerald-700 transition">
                <Globe2 className="h-3.5 w-3.5 text-slate-400" />
                <span>{language}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl z-50 overflow-y-auto max-h-60">
                {languagesList.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-slate-50 ${
                      language === lang ? 'text-emerald-600 bg-emerald-50/60' : 'text-slate-500'
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
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Pages content switches */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* ==================================================
              TAB VIEW 1: DASHBOARD
              ================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 leading-none">{conversations.length}</h3>
                      <p className="text-xs font-extrabold text-slate-700 mt-1">Conversations</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Total this week</p>
                    </div>
                  </div>
                  <Sparkline color="green" />
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                      <BriefcaseMedical className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 leading-none">3</h3>
                      <p className="text-xs font-extrabold text-slate-700 mt-1">Health Searches</p>
                      <p className="text-[10px] text-slate-400 font-semibold">This week</p>
                    </div>
                  </div>
                  <Sparkline color="blue" />
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 leading-none">{escalationsList.filter(e => e.status.toLowerCase() === 'open').length || 1}</h3>
                      <p className="text-xs font-extrabold text-slate-700 mt-1">Escalation Request</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Open</p>
                    </div>
                  </div>
                  <Sparkline color="orange" />
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 leading-none">2</h3>
                      <p className="text-xs font-extrabold text-slate-700 mt-1">Reminders</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Active</p>
                    </div>
                  </div>
                  <Sparkline color="purple" />
                </div>
              </div>

              {/* Grid content columns */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
                {/* Recent Conversations */}
                <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs flex flex-col min-h-[420px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-base font-bold text-slate-800">Recent Conversations</h2>
                    <button
                      onClick={() => navigateToTab('history')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    {displayedConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-12 text-slate-400">
                        <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs font-semibold">No recent conversations</p>
                        <p className="text-[10px] text-slate-400 mt-1">Talk to Aarogyam to start a new chat.</p>
                      </div>
                    ) : (
                      displayedConversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className="flex items-center justify-between rounded-2xl border border-slate-50 bg-[#FCFDFE] p-4 transition-all hover:bg-slate-50/50 hover:shadow-2xs cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F4EA] text-[#059669]">
                              <MessageSquare className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-slate-400 font-bold">{conv.date}</p>
                              <p className="text-sm font-semibold text-slate-700 mt-0.5 truncate pr-4">
                                {conv.messages.find((m) => m.sender === 'user')?.text || conv.summary || 'Voice Consultation'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition opacity-0 group-hover:opacity-100"
                              title="Delete History"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => navigateToTab('history')}
                    className="mt-4 w-full py-3.5 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition flex items-center justify-center gap-2"
                  >
                    <span>View full conversation history</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </section>

                {/* Right side: Escalations & Quick Access */}
                <div className="space-y-6">
                  {/* Escalation log banner */}
                  <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                      <h2 className="text-base font-bold text-slate-800">Escalation Requests</h2>
                      <button
                        onClick={() => navigateToTab('escalations')}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        View all
                      </button>
                    </div>
                    {escalationsList.slice(0, 1).map((esc) => (
                      <div key={esc.id} className="bg-rose-50/20 border border-rose-100/50 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                            {esc.urgency.toUpperCase()} PRIORITY
                          </span>
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100/60 text-[9px] font-black px-2 py-0.5 rounded">
                            STATUS: {esc.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-xs font-bold text-slate-700">ID: {esc.id}</span>
                        </div>
                        <div className="flex gap-4 mt-3">
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <p className="text-xs text-slate-600 font-semibold truncate">
                              <span className="font-bold text-slate-800">Issue:</span> {esc.problemSummary}
                            </p>
                            <p className="text-xs text-slate-600 font-semibold">
                              <span className="font-bold text-slate-800">Urgency:</span>{' '}
                              <span className="text-rose-600 font-bold">{esc.urgency}</span>
                            </p>
                            <p className="text-xs text-slate-600 font-semibold">
                              <span className="font-bold text-slate-800">Follow-up:</span> {esc.preferredFollowUp}
                            </p>
                          </div>
                          <HeartPulseGraphic />
                        </div>
                        <div className="flex justify-end mt-4">
                          <button
                            onClick={() => {
                              setSelectedEscalation(esc);
                              navigateToTab('escalations');
                            }}
                            className="rounded-full bg-[#059669] hover:bg-[#047857] text-white px-5 py-2.5 text-xs font-bold shadow-sm transition hover:scale-102 cursor-pointer"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </section>

                  {/* Quick Access */}
                  <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                    <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">Quick Access</h2>
                    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                      <QuickAccessItem
                        icon={Mic}
                        label="Talk to Aarogyam"
                        color="green"
                        onClick={() => navigateToTab('talk')}
                      />
                      <QuickAccessItem
                        icon={BriefcaseMedical}
                        label="Find Health Services"
                        color="blue"
                        onClick={() => navigateToTab('services')}
                      />
                      <QuickAccessItem
                        icon={Shield}
                        label="Escalation Requests"
                        color="orange"
                        onClick={() => navigateToTab('escalations')}
                      />
                      <QuickAccessItem
                        icon={Bell}
                        label="Reminders"
                        color="purple"
                        onClick={() => navigateToTab('reminders')}
                      />
                      <QuickAccessItem
                        icon={UserIcon}
                        label="My Profile"
                        color="teal"
                        onClick={() => navigateToTab('profile')}
                      />
                    </div>
                  </section>
                </div>
              </div>

              {/* Safety Footer */}
              <footer className="bg-gradient-to-r from-emerald-50 to-blue-50/50 rounded-3xl border border-slate-100/50 p-6 md:p-8 flex items-center justify-between gap-6 shadow-2xs">
                <div className="space-y-2 flex-1">
                  <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-1.5">
                    Aarogyam is here for you 💚
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 font-semibold leading-relaxed max-w-xl">
                    Your health information is safe with us. We never share your personal data without your consent.
                  </p>
                </div>
                <FooterIllustration />
              </footer>

              {/* copyright info */}
              <div className="text-center text-[10px] text-slate-400 font-semibold tracking-wide">
                © 2026 Aarogyam AI. All rights reserved. <span className="text-rose-400">❤</span>
              </div>
            </div>
          )}

          {/* ==================================================
              TAB VIEW 2: TALK TO AAROGYAM
              ================================================== */}
          {activeTab === 'talk' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Mic className="text-emerald-500" />
                  Speak to Aarogyam
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Start your voice health assistant. Speak naturally in English, Hindi, or Hinglish to describe symptoms or find clinics.
                </p>
              </div>

              <div className="overflow-hidden rounded-3xl bg-slate-950 shadow-2xl border border-slate-900">
                <AarogyamVoiceOverlay isEmbedded={true} />
              </div>
            </div>
          )}

          {/* ==================================================
              TAB VIEW 3: HISTORY
              ================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="text-emerald-500" />
                    Conversation History
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Review your voice consultations and transcripts</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {(['all', 'today', 'week', 'escalated'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setHistoryFilter(filter)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                        historyFilter === filter
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {filter === 'all' && 'All'}
                      {filter === 'today' && 'Today'}
                      {filter === 'week' && 'This Week'}
                      {filter === 'escalated' && 'Escalated'}
                    </button>
                  ))}
                </div>
              </div>

              {/* History List */}
              {filteredConversations.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-2xs">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-semibold text-sm">No conversations found</p>
                  <p className="text-xs text-slate-400 mt-1">Try changing the filter or starting a new call.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredConversations.map((conv) => {
                    const isEscalated = conv.messages.some((m) => m.sender === 'assistant' && m.text.includes('Reference ID:'));
                    return (
                      <div
                        key={conv.id}
                        onClick={() => selectConversation(conv)}
                        className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400 font-bold">{conv.date}</span>
                            <div className="flex items-center gap-1.5">
                              {isEscalated && (
                                <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded">
                                  ESCALATED
                                </span>
                              )}
                              <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                {conv.messages.length} messages
                              </span>
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-slate-800 mt-3 line-clamp-2 leading-relaxed">
                            {conv.summary || 'Voice Consultation'}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-4">
                          <span className="text-[10px] text-slate-400 font-medium">Click to view details</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              TAB VIEW 4: HEALTH SERVICES
              ================================================== */}
          {activeTab === 'services' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BriefcaseMedical className="text-emerald-500" />
                  Healthcare Services Directory
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Search for hospitals, clinics, and doctors nearby using direct OpenStreetMap integration.
                </p>

                {/* Search Bar */}
                <form onSubmit={handleSearchHealthcare} className="mt-6 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter city, neighborhood, or area in India (e.g. Dehradun)"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchLoading || !searchLocation.trim()}
                    className="px-6 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl text-sm font-bold shadow-md hover:scale-102 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSearchLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Search Results */}
              {isSearchLoading && (
                <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-2xs">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-semibold">Searching healthcare facilities near "{searchLocation}"...</p>
                  <p className="text-xs text-slate-400 mt-1">Accessing Nominatim and Overpass servers...</p>
                </div>
              )}

              {searchError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl p-6 text-sm flex gap-3">
                  <Info className="w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="font-bold">Lookup Failed</h4>
                    <p className="text-xs mt-1">{searchError}</p>
                  </div>
                </div>
              )}

              {facilitiesResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs text-slate-400 font-bold">
                      RESOLVED LOCATION: {facilitiesResults.location}
                    </span>
                    <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-mono font-bold">
                      {facilitiesResults.facilities?.length || 0} facilities found
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {facilitiesResults.facilities?.map((fac: any, index: number) => (
                      <div
                        key={index}
                        className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-md uppercase">
                              {fac.type}
                            </span>
                            <span className="text-xs text-slate-600 font-bold">
                              {fac.distance_km} km away
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 leading-snug">{fac.name}</h3>
                          <p className="text-xs text-slate-400 leading-normal">{fac.address}</p>
                        </div>

                        <div className="border-t border-slate-50 pt-3 mt-4 flex justify-between items-center text-[10px] text-slate-400">
                          <span>Verified OSM Contributors</span>
                          <button
                            onClick={() => alert(`Location: ${fac.name}\nCoordinates: Lat ${fac.lat}, Lon ${fac.lon}\nAddress: ${fac.address}`)}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              TAB VIEW 5: ESCALATION REQUESTS
              ================================================== */}
          {activeTab === 'escalations' && (
            <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ShieldAlert className="text-rose-500" />
                    Human Help Escalation Logs
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Review active support requests and human handoff records</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {(['all', 'open', 'in_progress', 'resolved'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setEscalationsFilter(filter)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                        escalationsFilter === filter
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {filter === 'all' && 'All'}
                      {filter === 'open' && 'Open'}
                      {filter === 'in_progress' && 'In Progress'}
                      {filter === 'resolved' && 'Resolved'}
                    </button>
                  ))}
                </div>
              </div>

              {isEscalationsLoading ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-2xs">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-semibold">Fetching escalations from database...</p>
                </div>
              ) : filteredEscalations.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-2xs">
                  <Shield className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-600 font-semibold text-sm">No escalation records found</p>
                  <p className="text-xs text-slate-400 mt-1">Requests are automatically created during call triage with permission.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEscalations.map((esc) => {
                    const urgencyColors = {
                      low: 'bg-slate-50 text-slate-500 border-slate-200',
                      medium: 'bg-blue-50 text-blue-600 border-blue-100',
                      high: 'bg-orange-50 text-orange-600 border-orange-100',
                      emergency: 'bg-rose-50 text-rose-600 border-rose-100'
                    }[esc.urgency.toLowerCase() as 'low'|'medium'|'high'|'emergency'] || 'bg-slate-50 text-slate-500';

                    const statusColors = {
                      open: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                      in_progress: 'bg-amber-50 text-amber-600 border-amber-200',
                      resolved: 'bg-slate-100 text-slate-500 border-slate-200'
                    }[esc.status.replace(' ', '_').toLowerCase() as 'open'|'in_progress'|'resolved'] || 'bg-emerald-50 text-emerald-600';

                    return (
                      <div
                        key={esc.id}
                        onClick={() => setSelectedEscalation(esc)}
                        className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition cursor-pointer flex flex-col justify-between border-l-4 border-l-rose-500"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">{esc.id}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${statusColors}`}>
                              {esc.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 font-bold mt-2">
                            {new Date(esc.timestamp).toLocaleString()}
                          </p>

                          <h3 className="text-sm font-bold text-slate-700 mt-2 line-clamp-2 leading-relaxed">
                            {esc.problemSummary}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-4">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${urgencyColors}`}>
                            {esc.urgency}
                          </span>
                          <span className="text-xs font-bold text-[#059669] flex items-center gap-1 hover:underline">
                            View details
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              TAB VIEW 6: REMINDERS
              ================================================== */}
          {activeTab === 'reminders' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="text-emerald-500" />
                  Personal Reminders Setup
                </h2>
                <p className="text-xs text-slate-500 mt-1">Configure follow-ups, medicine guidelines, and activities</p>

                {/* Add Reminder Form */}
                <form onSubmit={handleAddReminder} className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-100/60 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Reminder Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Drink 2L water / Medicine time"
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 08:30 AM"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </form>
              </div>

              {/* Reminders List */}
              <div className="space-y-3">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs flex items-center justify-between gap-4 transition-all ${
                      !rem.active ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        rem.type === 'health' ? 'bg-rose-50 text-rose-500' :
                        rem.type === 'activity' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                      }`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{rem.title}</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {rem.time} • Repeat: {rem.repeat}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleReminder(rem.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border transition ${
                          rem.active
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/50'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {rem.active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-slate-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================
              TAB VIEW 7: WELLNESS TIPS
              ================================================== */}
          {activeTab === 'tips' && (
            <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Leaf className="text-emerald-500" />
                  General Wellness Tips
                </h2>
                <p className="text-xs text-slate-500 mt-1">Informational wellness, daily activity, and stress hygiene guidelines</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  {
                    title: 'Hydration Strategy',
                    desc: 'Drinking 2 to 3 liters of water daily supports cellular energy and cognitive performance. Try drinking a glass immediately upon waking.',
                    topic: 'hydration tips and daily water intake targets',
                    icon: Leaf,
                    color: 'text-blue-500 bg-blue-50 border-blue-100'
                  },
                  {
                    title: 'Sleep Hygiene',
                    desc: 'Prioritize a 7 to 8-hour sleep schedule. Limit screens 60 minutes before bed and keep your room cool and dark for deeper rest.',
                    topic: 'healthy sleep hygiene practices',
                    icon: Clock,
                    color: 'text-purple-500 bg-purple-50 border-purple-100'
                  },
                  {
                    title: 'Stress Management',
                    desc: 'Practice box breathing (inhale for 4s, hold 4s, exhale 4s, hold 4s) to restore autonomic nervous balance during hectic hours.',
                    topic: 'stress management and breathing exercises',
                    icon: Heart,
                    color: 'text-rose-500 bg-rose-50 border-rose-100'
                  },
                  {
                    title: 'Daily Active Target',
                    desc: 'Aim for a 7,000 to 10,000 steps daily baseline. Short brisk walks after meals drastically assist digestion and glucose control.',
                    topic: 'step goals and walking exercises',
                    icon: Activity,
                    color: 'text-emerald-500 bg-emerald-50 border-emerald-100'
                  }
                ].map((tip, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${tip.color}`}>
                        <tip.icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mt-4">{tip.title}</h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">{tip.desc}</p>
                    </div>

                    <div className="border-t border-slate-50 pt-4 mt-5 flex justify-end">
                      <button
                        onClick={() => handleWellnessTipClick(tip.topic)}
                        className="text-xs font-bold text-[#059669] hover:text-[#047857] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>Ask Aarogyam about this</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================
              TAB VIEW 8: MY PROFILE
              ================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
              {/* Profile Card */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs flex flex-col md:flex-row items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-3xl font-black shadow-md shadow-emerald-500/10">
                  {user?.name ? user.name[0].toUpperCase() : 'C'}
                </div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-xl font-bold text-slate-800">{user?.name || 'Chetna'}</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">Joined: {user?.joinedDate || '8/12/2026'}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Primary Email: {user?.email || 'chetna@aarogyam.ai'}</p>
                </div>
              </div>

              {/* What Aarogyam Remembers */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="text-emerald-500" />
                    What Aarogyam Remembers (Caller Memory)
                  </h3>
                  <button
                    onClick={handleClearSavedMemory}
                    disabled={isProfileLoading}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50"
                  >
                    Clear Saved Memory
                  </button>
                </div>

                {isProfileLoading ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500 mb-2" />
                    Retrieving facts from SQLite caller record...
                  </div>
                ) : dbProfileFacts.length === 0 ? (
                  <div className="p-6 bg-slate-50/50 rounded-2xl text-center border border-slate-100/60 text-slate-400 text-xs font-semibold leading-relaxed">
                    No persistent facts saved yet. During voice chats, Aarogyam AI will verbally ask for permission to remember preferences (e.g. language preference or step goals).
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dbProfileFacts.map((fact, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 px-4 py-3 bg-[#E6F4EA]/40 text-[#0f5132] rounded-xl text-xs font-semibold">
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{fact}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              TAB VIEW 9: SETTINGS
              ================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
              {/* Language Preferences */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs space-y-4">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-2">
                  <Globe2 className="text-emerald-500" />
                  Language Preferences
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Preferred Voice Assistant Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 text-xs font-semibold text-slate-700"
                  >
                    <option value="English">English (Full English)</option>
                    <option value="हिन्दी">हिन्दी (Devanagari)</option>
                    <option value="Hinglish">Hinglish (Hindi + English written in Latin)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-2 font-semibold">Aarogyam AI dynamically adapts its instructions based on this option.</p>
                </div>
              </div>

              {/* Notification Center */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs space-y-4">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-2">
                  <Bell className="text-emerald-500" />
                  Notifications Settings
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-700">Health follow-up reminders</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Receive updates about step goals and active habits</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer border-t border-slate-50 pt-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-700">Escalation log updates</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Receive reminders when a human support executive reviews a log</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Privacy Management */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs space-y-4">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-2">
                  <Lock className="text-emerald-500" />
                  Privacy & Data Sharing
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-700 font-sans">Active Memory (Caller Profile)</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">Allow Aarogyam AI to remember wellness facts following explicit verbal consent</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-[9px] font-black tracking-wider px-2 py-0.5 rounded uppercase shrink-0">
                      ENABLED
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-slate-50 pt-3">
                    <div>
                      <span className="text-xs font-bold text-slate-700 font-sans">Escalation Handoff Consent</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">Create human healthcare requests only after explicit verification checks during conversations</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-[9px] font-black tracking-wider px-2 py-0.5 rounded uppercase shrink-0">
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              TAB VIEW 10: PRIVACY CENTER
              ================================================== */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="text-emerald-500" />
                  Privacy Center
                </h2>
                <p className="text-xs text-slate-500 mt-1">Understand how Aarogyam secures and shares your wellness metrics</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs space-y-5 leading-relaxed text-xs text-slate-600 font-semibold">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                    What does Aarogyam remember?
                  </h3>
                  <p>
                    Aarogyam is designed to store basic profile settings such as your name, language preference, and approved wellness targets (e.g. daily step limits or exercise choice). It does NOT save precise coordinate details or private health records.
                  </p>
                </div>

                <div className="space-y-2 border-t border-slate-50 pt-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    Memory requires your explicit consent
                  </h3>
                  <p>
                    Aarogyam will never save parameters automatically. If you mention a wellness metric, the AI will verbally request your permission. Only after a positive affirmation will it call the save function. You can clear this saved history anytime from your profile settings.
                  </p>
                </div>

                <div className="space-y-2 border-t border-slate-50 pt-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    What is shared during human handoffs?
                  </h3>
                  <p>
                    If you report red-flag medical symptoms (like severe breathing issues) or ask for a diagnosis, Aarogyam refuses treatment immediately and offers to submit a request for a human specialist. If you give explicit consent, it packages a concise summary containing the problem, what it checked, and preferred contact method.
                  </p>
                  <p className="text-rose-600">
                    Important: Credentials, OTPs, PINs, bank details, and the raw conversation transcripts are strictly filtered and never stored or sent.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

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

      {/* Escalation Request Detail Modal */}
      {selectedEscalation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Request: {selectedEscalation.id}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Logged on {new Date(selectedEscalation.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedEscalation(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Urgency level</span>
                <span className="text-xs text-rose-600 font-black uppercase">{selectedEscalation.urgency}</span>
              </div>
              <div className="border-t border-slate-50 pt-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Concise problem summary</span>
                <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                  {selectedEscalation.problemSummary}
                </p>
              </div>
              <div className="border-t border-slate-50 pt-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase">What Aarogyam already checked</span>
                <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                  {selectedEscalation.checksPerformed}
                </p>
              </div>
              <div className="border-t border-slate-50 pt-3 flex justify-between gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Language</span>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedEscalation.language}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Preferred Follow-up</span>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedEscalation.preferredFollowUp}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Current Status</span>
                  <p className="text-xs font-bold text-[#059669] mt-0.5">{selectedEscalation.status.toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="border-t p-6 flex justify-end gap-3 bg-white">
              <button
                onClick={() => setSelectedEscalation(null)}
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
            if (user) {
              const key = `aarogyam_conversations_${user.email.trim().toLowerCase()}`;
              const stored = localStorage.getItem(key);
              if (stored) {
                try {
                  setConversations(JSON.parse(stored));
                } catch (e) {
                  console.error(e);
                }
              } else {
                setConversations([]);
              }
            } else {
              setConversations([]);
            }
          }}
        />
      )}
    </div>
  );
}

const QuickAccessItem = ({ icon: Icon, label, color, onClick }: any) => {
  const colorMap = {
    green: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100/70 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100/70 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100/70 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100/70 border-purple-100',
    teal: 'bg-teal-50 text-teal-600 hover:bg-teal-100/70 border-teal-100'
  }[color as 'green' | 'blue' | 'orange' | 'purple' | 'teal'];

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group focus:outline-none shrink-0"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${colorMap} shadow-2xs group-hover:scale-105`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors text-center w-16 leading-tight">
        {label}
      </span>
    </button>
  );
};

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
