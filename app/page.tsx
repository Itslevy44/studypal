import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col bg-white overflow-hidden">

      {/* Subtle gradient top decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12 lg:px-24 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-md shadow-indigo-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">StudyPal</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition">Features</a>
          <Link href="/auth/login" className="hover:text-slate-900 transition">Login</Link>
          <Link
            href="/auth/register"
            className="glow-primary bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full font-semibold transition-all text-sm shadow-md shadow-indigo-500/20"
          >
            Get Started
          </Link>
        </div>
        <Link href="/auth/register" className="md:hidden bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
          Start Free
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-24 sm:py-32">
        {/* Background decoration */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-100 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-fuchsia-100 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Kenya's #1 Student Study Resource
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
            Ace Your Exams With{" "}
            <span className="text-gradient">Premium Past Papers</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-slate-500 leading-relaxed mb-12">
            Access thousands of past exam papers from top Kenyan universities. Browse freely, purchase securely via M-Pesa, and study smarter.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="glow-primary inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 px-8 py-4 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95"
            >
              Create Free Account
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-8 py-4 text-sm font-bold text-slate-700 transition-all hover:scale-105 active:scale-95"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div id="features" className="bg-slate-50 px-6 py-20 sm:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Everything You Need to Study</h2>
            <p className="text-slate-500">Built specifically for Kenyan university students.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
                color: 'bg-indigo-50 text-indigo-600',
                title: 'Extensive Archive',
                desc: 'Thousands of past papers by university, year, and course. Find what you need instantly.',
              },
              {
                icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
                color: 'bg-fuchsia-50 text-fuchsia-600',
                title: 'Pay via M-Pesa',
                desc: 'Seamless M-Pesa STK Push integration. Pay and get access in seconds.',
              },
              {
                icon: 'M13 10V3L4 14h7v7l9-11h-7z',
                color: 'bg-cyan-50 text-cyan-600',
                title: 'Instant Access',
                desc: 'Free papers are available immediately. Paid papers unlock after confirmed payment.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${f.color} mb-5`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 text-center">
        <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} StudyPal. All rights reserved.</p>
      </footer>
    </main>
  );
}
