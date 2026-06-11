'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface University {
  id: string;
  name: string;
  campuses: Array<{ id: string; name: string; location: string }>;
}

export default function StudentRegisterPage() {
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [campus, setCampus] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('Year 1');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  useEffect(() => {
    fetch('/api/universities')
      .then((r) => r.json())
      .then((d) => setUniversities(d.universities || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (university) {
      const selected = universities.find((u) => u.id === university);
      setCampuses(selected?.campuses || []);
      setCampus('');
    } else {
      setCampuses([]);
    }
  }, [university, universities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', isError: true });
      return;
    }
    setLoading(true);
    setMessage({ text: '', isError: false });
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, university, campus, yearOfStudy }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ text: data.error || 'Registration failed', isError: true });
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setMessage({ text: 'Account created! Redirecting…', isError: false });
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch (error: any) {
      setMessage({ text: error.message || 'Connection error', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500" />

      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-2xl animate-fade-in">

          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition mb-8">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/60 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">StudyPal</h1>
                <p className="text-xs text-slate-400">Create your account</p>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Get Started Free</h2>
            <p className="text-slate-400 text-sm mb-7">Join thousands of Kenyan students studying smarter.</p>

            {message.text && (
              <div className={`mb-5 rounded-xl p-3.5 text-sm font-medium flex items-center gap-2 border ${
                message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={message.isError ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                </svg>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className={inputClass} required disabled={loading} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.ac.ke" className={inputClass} required disabled={loading} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">University</label>
                  <select value={university} onChange={(e) => setUniversity(e.target.value)} className={inputClass} required disabled={loading}>
                    <option value="">Select University</option>
                    {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Campus</label>
                  <select value={campus} onChange={(e) => setCampus(e.target.value)} className={`${inputClass} disabled:opacity-50`} required disabled={loading || !university}>
                    <option value="">Select Campus</option>
                    {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Year of Study</label>
                <select value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} className={inputClass} disabled={loading}>
                  {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} required disabled={loading} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputClass} required disabled={loading} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glow-primary w-full rounded-xl py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 transition-all mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating Account…
                  </span>
                ) : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
