import Link from "next/link";

const features = [
  { emoji: "📚", title: "Vast Paper Archive", desc: "Thousands of past papers from top Kenyan universities — every faculty, year and course." },
  { emoji: "📱", title: "Instant M-Pesa Pay", desc: "Secure STK Push payments. Pay with your phone, get instant 3-month access." },
  { emoji: "📥", title: "Download & Study Offline", desc: "Download papers and study anywhere — no internet needed once downloaded." },
  { emoji: "🏫", title: "University Specific", desc: "Papers filtered to your university and course. No clutter — just what you need." },
  { emoji: "🛍️", title: "Marketplace", desc: "Buy and sell academic items — textbooks, calculators, furniture and more." },
  { emoji: "✅", title: "Free Papers Too", desc: "Many papers are completely free — access instantly, study immediately." },
];

const steps = [
  { n: "01", title: "Download the App", desc: 'Tap "Download APK" below and install it on your Android phone.' },
  { n: "02", title: "Create Account", desc: "Sign up with your university email in under 60 seconds." },
  { n: "03", title: "Pay via M-Pesa", desc: "Enter your number, approve the STK push — instant 3-month access." },
  { n: "04", title: "Download & Study", desc: "Download papers and study anywhere — online or offline." },
];

// ── Update this on every new release ─────────────────────────────────────────
const LATEST_VERSION = '1.0.0';
// Once the EAS build finishes, replace this with your actual APK URL.
// e.g. '/download/studypal-v1.0.0.apk' once you self-host it,
// or keep the EAS build link below — it works for direct downloads too.
const APK_URL = 'https://studypal-rust.vercel.app/api/download/apk';
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-[var(--font-inter)]">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-sm">SP</span>
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">StudyPal</span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-500">
            <a href="#download" className="hover:text-indigo-600 transition-colors">Download</a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <a
              href={APK_URL}
              className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95"
            >
              ⬇ Download APK
            </a>
          </div>
          <a href={APK_URL} className="md:hidden bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/25">
            ⬇ APK
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 py-28 sm:py-36">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 backdrop-blur-sm px-5 py-2 text-xs font-bold text-indigo-300 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Kenya&apos;s #1 Student Study Resource · v{LATEST_VERSION}
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white mb-6 leading-[1.05]">
            Ace Your Exams With{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Past Papers
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-300 leading-relaxed mb-12">
            Install the StudyPal Android app. Browse thousands of past exam papers, pay via M-Pesa, and study offline — anytime, anywhere.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href={APK_URL}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 hover:from-indigo-400 hover:via-fuchsia-400 hover:to-cyan-400 px-8 py-4 text-base font-bold text-white transition-all shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download APK · v{LATEST_VERSION}
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 px-8 py-4 text-base font-bold text-white transition-all hover:scale-105 active:scale-95"
            >
              How to Install
            </a>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { value: "500+", label: "Past Papers" },
              { value: "20+", label: "Universities" },
              { value: "M-Pesa", label: "Secure Payment" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <p className="text-2xl sm:text-3xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download Section ── */}
      <section id="download" className="py-20 bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-cyan-50 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-4">Android App</span>
          <h2 className="text-4xl font-black text-slate-900 mb-4">Download StudyPal APK</h2>
          <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto">
            The StudyPal app is available as a direct APK download for Android phones. No Google Play account needed.
          </p>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Latest Release</p>
                <p className="text-2xl font-black text-slate-900">StudyPal v{LATEST_VERSION}</p>
                <p className="text-sm text-slate-500 mt-1">Android 6.0+ · ~25 MB</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Stable
                </span>
              </div>
            </div>

            <a
              href={APK_URL}
              download
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download APK
            </a>

            <p className="text-xs text-slate-400 mt-4 text-center">
              After downloading, open the file and tap <strong>Install</strong>. You may need to enable &quot;Install from unknown sources&quot; in your Android settings.
            </p>
          </div>

          {/* Install steps */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-left shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-5">📋 How to Install</h3>
            <ol className="space-y-4">
              {[
                'Tap the "Download APK" button above on your Android phone.',
                'When the download finishes, open the APK file from your notification bar or Downloads folder.',
                'If prompted, go to Settings → Security → enable "Install unknown apps" for your browser.',
                'Tap Install. The app will appear on your home screen as "StudyPal".',
                'Open the app, create your account, and start studying!',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-600 leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-slate-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-4">Features</span>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Everything You Need to Study Better</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">Built specifically for Kenyan university students.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-5">{f.emoji}</div>
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
            <h2 className="text-4xl font-black text-slate-900 mb-4">Up & Studying in 4 Steps</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">From download to your first paper in under 5 minutes.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.n} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] right-[-2.5rem] h-px bg-gradient-to-r from-indigo-200 to-fuchsia-200" />
                )}
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-xl shadow-indigo-500/30 mb-5 text-white font-black text-xl">{s.n}</div>
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">Ready to Study Smarter?</h2>
          <p className="text-xl text-indigo-200 mb-10">Download the app and join thousands of Kenyan students using StudyPal.</p>
          <a
            href={APK_URL}
            download
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-indigo-600 px-8 py-4 font-bold text-base hover:bg-indigo-50 transition-all shadow-2xl hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download APK · v{LATEST_VERSION}
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-black text-sm">SP</span>
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">StudyPal</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#download" className="hover:text-slate-300 transition-colors">Download</a>
              <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
              <a href="#how" className="hover:text-slate-300 transition-colors">How It Works</a>
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
