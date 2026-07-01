'use client';

import Link from "next/link";
import { useState, useEffect } from "react";

// Typed BeforeInstallPromptEvent (not in standard TS lib)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const features = [
  {
    gradient: "from-indigo-500 to-violet-600",
    bg: "from-indigo-50 to-violet-50",
    title: "Vast Paper Archive",
    desc: "Thousands of curated past papers spanning every faculty, year and course — all in one place.",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    gradient: "from-fuchsia-500 to-pink-600",
    bg: "from-fuchsia-50 to-pink-50",
    title: "Instant M-Pesa Pay",
    desc: "Secure STK Push payments. Pay with your phone, get instant access — no card needed.",
    icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    gradient: "from-cyan-500 to-teal-600",
    bg: "from-cyan-50 to-teal-50",
    title: "Download & Study Offline",
    desc: "Download papers after purchase and study offline, anytime, anywhere — even without internet.",
    icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  },
  {
    gradient: "from-amber-500 to-orange-600",
    bg: "from-amber-50 to-orange-50",
    title: "University Specific",
    desc: "Papers filtered to your university and course. No clutter — just what you need.",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    gradient: "from-violet-500 to-purple-600",
    bg: "from-violet-50 to-purple-50",
    title: "Marketplace",
    desc: "Browse, discover, and purchase from a growing marketplace of academic resources.",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  },
  {
    gradient: "from-emerald-500 to-green-600",
    bg: "from-emerald-50 to-green-50",
    title: "Free Papers Too",
    desc: "Many papers are completely free — no payment needed. Access instantly, study immediately.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
];

const steps = [
  { step: "01", title: "Install the App", desc: "Tap 'Install App' below or 'Add to Home Screen' in your browser to install StudyPal on your phone." },
  { step: "02", title: "Create Account", desc: "Sign up with your university email in under 60 seconds." },
  { step: "03", title: "Pay via M-Pesa", desc: "Enter your number, approve the STK push — instant 3-month access." },
  { step: "04", title: "Download & Study", desc: "Download papers and study anywhere — online or offline." },
];

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'installed' | 'unavailable'>('idle');
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setInstallStatus('installed');
    }

    // Check for iOS (Safari doesn't support beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Capture the install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallStatus('installed');
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!installPrompt) {
      // Fallback: open the app in browser if prompt not available
      setInstallStatus('unavailable');
      return;
    }

    setInstallStatus('installing');
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallStatus('installed');
        setInstallPrompt(null);
      } else {
        setInstallStatus('idle');
      }
    } catch {
      setInstallStatus('idle');
    }
  };

  const installButtonLabel = () => {
    if (isInstalled || installStatus === 'installed') return '✓ App Installed';
    if (installStatus === 'installing') return 'Installing…';
    if (isIOS) return 'Install on iPhone / iPad';
    return 'Install App — Free';
  };

  return (
    <main className="min-h-screen bg-white font-[var(--font-inter)]">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">StudyPal</span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-500">
            <a href="#download" className="hover:text-indigo-600 transition-colors">Get the App</a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <Link href="/auth/login" className="hover:text-indigo-600 transition-colors">Sign In</Link>
            <Link href="/auth/register" className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95">
              Get Started Free
            </Link>
          </div>
          <Link href="/auth/register" className="md:hidden bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/25">
            Start Free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 py-28 sm:py-36">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyIgZD0iTTAgMGg2MHY2MEgweiIvPjxwYXRoIGQ9Ik02MCAwSDBoNjB2NjBIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiIHN0cm9rZS13aWR0aD0iLjUiLz48L2c+PC9zdmc+')] opacity-40 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 backdrop-blur-sm px-5 py-2 text-xs font-bold text-indigo-300 mb-8 animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Kenya&apos;s #1 Student Study Resource — Now as an App
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white mb-6 animate-slide-up leading-[1.05]">
            Ace Your Exams With{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">Premium Past Papers</span>
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 rounded-full opacity-60" />
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-300 leading-relaxed mb-12">
            Access thousands of past exam papers from top Kenyan universities. Install the app, browse freely, purchase securely via M-Pesa, and download to study anywhere.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <button
              onClick={handleInstall}
              disabled={isInstalled || installStatus === 'installed'}
              className={`inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold transition-all shadow-2xl hover:scale-105 active:scale-95 ${
                isInstalled || installStatus === 'installed'
                  ? 'bg-emerald-500 text-white shadow-emerald-500/40 cursor-default'
                  : 'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 hover:from-indigo-400 hover:via-fuchsia-400 hover:to-cyan-400 text-white shadow-indigo-500/40 hover:shadow-indigo-500/60'
              }`}
            >
              {isInstalled || installStatus === 'installed' ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  App Installed
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {installButtonLabel()}
                </>
              )}
            </button>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 px-8 py-4 text-base font-bold text-white transition-all hover:scale-105 active:scale-95"
            >
              Use in Browser
            </Link>
          </div>

          {/* PWA install tip */}
          {installStatus === 'unavailable' && !isIOS && (
            <p className="text-sm text-amber-300 mb-6 animate-fade-in">
              Open this page in Chrome on Android, then tap the menu → &ldquo;Add to Home Screen&rdquo; to install.
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { value: "500+", label: "Past Papers" },
              { value: "20+", label: "Universities" },
              { value: "M-Pesa", label: "Secure Payment" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <p className="text-2xl sm:text-3xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── iOS Instructions Modal ── */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-slate-900">Install on iPhone / iPad</h3>
              <button onClick={() => setShowIOSInstructions(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <ol className="space-y-4 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">1</span>
                <span>Open this page in <strong>Safari</strong> on your iPhone or iPad.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">2</span>
                <span>Tap the <strong>Share</strong> button <span className="inline-block text-indigo-600">⬆</span> at the bottom of Safari.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">3</span>
                <span>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">4</span>
                <span>Tap <strong>&ldquo;Add&rdquo;</strong> in the top-right corner. StudyPal will appear on your home screen!</span>
              </li>
            </ol>
            <button onClick={() => setShowIOSInstructions(false)} className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-fuchsia-500 transition-all">
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* ── Download / Install Section ── */}
      <section id="download" className="py-20 bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-cyan-50 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-4">Get the App</span>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Install StudyPal on Your Phone</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">StudyPal is a Progressive Web App — install it directly from your browser. No App Store needed.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Android Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.34L19 13.87a.5.5 0 00-.71-.71L16.81 14.65A7.48 7.48 0 0012 13a7.48 7.48 0 00-4.81 1.65L5.71 13.16a.5.5 0 00-.71.71l1.477 1.47A7.5 7.5 0 0012 20.5a7.5 7.5 0 005.523-5.16zM10 17.5a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zM6.92 9.08l-1.5-2.6a.5.5 0 00-.87.5l1.47 2.55A7.48 7.48 0 0012 8a7.48 7.48 0 005.98 1.53l1.47-2.55a.5.5 0 00-.87-.5l-1.5 2.6A6.48 6.48 0 0112 9a6.48 6.48 0 01-5.08-.92z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Android</h3>
                  <p className="text-sm text-slate-500">Chrome recommended</p>
                </div>
              </div>
              <ol className="space-y-3 text-sm text-slate-600 mb-6">
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">1</span>Open this page in <strong className="text-slate-800">Chrome</strong></li>
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">2</span>Tap the <strong className="text-slate-800">install banner</strong> at the bottom or the button below</li>
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">3</span>Tap <strong className="text-slate-800">&ldquo;Install&rdquo;</strong> — it&apos;s added to your home screen instantly</li>
              </ol>
              <button
                onClick={handleInstall}
                disabled={isInstalled}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  isInstalled
                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {isInstalled ? '✓ Installed' : 'Install on Android'}
              </button>
            </div>

            {/* iOS Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/25">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">iPhone / iPad</h3>
                  <p className="text-sm text-slate-500">Safari required</p>
                </div>
              </div>
              <ol className="space-y-3 text-sm text-slate-600 mb-6">
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">1</span>Open this page in <strong className="text-slate-800">Safari</strong></li>
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">2</span>Tap the <strong className="text-slate-800">Share ⬆</strong> button at the bottom</li>
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">3</span>Tap <strong className="text-slate-800">&ldquo;Add to Home Screen&rdquo;</strong> then <strong className="text-slate-800">&ldquo;Add&rdquo;</strong></li>
              </ol>
              <button
                onClick={() => setShowIOSInstructions(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Show Instructions
              </button>
            </div>
          </div>

          {/* PWA explanation */}
          <div className="mt-8 bg-white rounded-2xl border border-indigo-100 p-6 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">What is a Progressive Web App?</h4>
              <p className="text-sm text-slate-500 leading-relaxed">StudyPal is a PWA — a web app that installs directly on your phone like a native app. No app store required. You get the full app experience: home screen icon, offline support, and fast loading — all from your browser.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-slate-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-4">Features</span>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Everything You Need to Study Better</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">Built specifically for Kenyan university students who want to get ahead.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group bg-white rounded-3xl border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/80 transition-all duration-300 hover:-translate-y-1">
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.bg} mb-6 group-hover:scale-110 transition-transform`}>
                  <div className={`bg-gradient-to-br ${f.gradient} rounded-xl p-2.5 text-white`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="py-24 bg-white px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-bold uppercase tracking-widest mb-4">Simple Process</span>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Up & Studying in 4 Easy Steps</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">From install to download in under 5 minutes.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] right-[-2.5rem] h-px bg-gradient-to-r from-indigo-200 to-fuchsia-200" />
                )}
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-xl shadow-indigo-500/30 mb-5 text-white font-black text-xl">{s.step}</div>
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-fuchsia-500/20 rounded-full -ml-10 -mb-10 pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">Ready to Start Studying Smarter?</h2>
          <p className="text-xl text-indigo-200 mb-10">Install the app or create a free account and join thousands of Kenyan students using StudyPal.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleInstall}
              disabled={isInstalled}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 font-bold text-base transition-all shadow-2xl hover:scale-105 active:scale-95 ${
                isInstalled
                  ? 'bg-emerald-400 text-white cursor-default'
                  : 'bg-white text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              {isInstalled ? '✓ App Installed' : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install App — Free
                </>
              )}
            </button>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/40 text-white px-8 py-4 font-bold text-base hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
            >
              Create Free Account
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">StudyPal</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#download" className="hover:text-slate-300 transition-colors">Get the App</a>
              <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
              <a href="#how" className="hover:text-slate-300 transition-colors">How It Works</a>
              <Link href="/auth/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
              <Link href="/admin" className="hover:text-slate-300 transition-colors">Admin</Link>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} StudyPal. Kenya&apos;s #1 Student Study Resource. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
