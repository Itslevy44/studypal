'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [paperCount, setPaperCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [universityCount, setUniversityCount] = useState(0);

  const fetchDashboardStats = async () => {
    try {
      const [papersResponse, universitiesResponse] = await Promise.all([
        fetch('/api/papers'),
        fetch('/api/universities'),
      ]);
      const papersData = await papersResponse.json();
      const universitiesData = await universitiesResponse.json();
      const papers = papersData.papers || [];
      setPaperCount(papers.length);
      setRevenue(papers.reduce((sum: number, paper: any) => sum + (Number(paper.cost) || 0), 0));
      setUniversityCount((universitiesData.universities || []).length);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    }
  };

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) setIsLoggedIn(true);
    setLoading(false);
    fetchDashboardStats();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginMessage(data.error || 'Login failed');
        return;
      }
      localStorage.setItem('adminToken', data.token);
      setIsLoggedIn(true);
      setAdminPassword('');
    } catch (error: any) {
      setLoginMessage(error.message || 'Connection error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    setTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  // ── Login Page ──
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-fuchsia-50 flex items-center justify-center p-6">
        {/* Background blobs */}
        <div className="fixed top-1/4 right-1/4 h-80 w-80 rounded-full bg-indigo-200/40 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-fuchsia-200/40 blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/80 p-10 border border-slate-200">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-xl shadow-indigo-500/30">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-1">Admin Portal</h1>
              <p className="text-slate-500 text-sm">StudyPal Administration</p>
            </div>

            {loginMessage && (
              <div className="mb-6 rounded-2xl p-4 text-sm font-medium border bg-red-50 border-red-200 text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {loginMessage}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Admin Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all text-sm font-medium"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Access Admin Portal
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← Back to Site</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ──
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900">StudyPal Admin</span>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm flex-shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-md shadow-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">StudyPal</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-600">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2">
          {[
            { key: 'dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { key: 'universities', label: 'Universities', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { key: 'upload', label: 'Upload Papers', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                tab === item.key
                  ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-16 md:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8 md:py-10 animate-fade-in">

          {tab === 'dashboard' && (
            <div className="animate-fade-in">
              {/* Welcome Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-700 p-8 mb-8 shadow-xl shadow-indigo-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">Admin Dashboard</p>
                  <h2 className="text-3xl font-black text-white mb-1">Platform Overview</h2>
                  <p className="text-indigo-200">Key metrics and statistics for StudyPal.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Papers', value: paperCount, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-indigo-600', bg: 'bg-indigo-50', display: String(paperCount) },
                  { label: 'Universities', value: universityCount, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', display: String(universityCount) },
                  { label: 'Paper Revenue', value: revenue, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-600', bg: 'bg-emerald-50', display: `KES ${revenue.toLocaleString()}` },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                      <svg className={`w-6 h-6 ${stat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                      </svg>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                    <p className={`text-4xl font-black ${stat.color}`}>{stat.display}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setTab('upload')}
                  className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">Upload New Paper</p>
                    <p className="text-sm text-slate-500">Add exam papers to the library</p>
                  </div>
                </button>
                <button
                  onClick={() => setTab('universities')}
                  className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-fuchsia-200 transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shadow-md shadow-fuchsia-500/25 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">Manage Universities</p>
                    <p className="text-sm text-slate-500">Add and manage university profiles</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {tab === 'universities' && (
            <UniversitiesManager adminToken={localStorage.getItem('adminToken') || ''} />
          )}

          {tab === 'upload' && (
            <PaperUploadManager adminToken={localStorage.getItem('adminToken') || ''} onUploadSuccess={fetchDashboardStats} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bright input class ──
const INPUT_CLASS = 'w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all text-sm font-medium';
const SELECT_CLASS = 'w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all text-sm font-medium';

function UniversitiesManager({ adminToken }: { adminToken: string }) {
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [campusName, setCampusName] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });

  useEffect(() => { fetchUniversities(); }, []);

  const fetchUniversities = async () => {
    try {
      const response = await fetch('/api/universities');
      const data = await response.json();
      setUniversities(data.universities || []);
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    try {
      const response = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name, campuses: campusName ? [{ name: campusName, location: '' }] : [] }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage({ text: data.error || 'Failed to add university', isError: true }); return; }
      setMessage({ text: 'University added successfully!', isError: false });
      setName(''); setCampusName(''); setShowForm(false);
      fetchUniversities();
    } catch (error: any) {
      setMessage({ text: error.message || 'Connection error', isError: true });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Manage Universities</h2>
          <p className="text-slate-500 mt-1">Add and manage university profiles</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
            showForm
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95'
          }`}
        >
          {showForm ? 'Cancel' : '+ Add University'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl mb-6 border text-sm font-medium flex items-center gap-2 ${
          message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddUniversity} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            Add New University
          </h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">University Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Egerton University" className={INPUT_CLASS} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">First Campus Name (optional)</label>
              <input type="text" value={campusName} onChange={(e) => setCampusName(e.target.value)}
                placeholder="e.g. Main Campus" className={INPUT_CLASS} />
            </div>
            <button type="submit"
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]">
              Add University
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <div className="h-5 w-2/3 bg-slate-200 rounded mb-3" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {universities.map((univ) => (
            <div key={univ.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">{univ.name}</h3>
                  <div className="space-y-1">
                    {univ.campuses?.map((campus: any) => (
                      <span key={campus.id} className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mr-1 mb-1">
                        📍 {campus.name} {campus.location && `(${campus.location})`}
                      </span>
                    ))}
                    {(!univ.campuses || univ.campuses.length === 0) && (
                      <span className="text-xs text-slate-400">No campuses added</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaperUploadManager({ adminToken, onUploadSuccess }: { adminToken: string; onUploadSuccess: () => void }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900">Upload Past Paper</h2>
        <p className="text-slate-500 mt-1">Add a new exam paper to the library</p>
      </div>
      <AdminUploadPage onUploadSuccess={onUploadSuccess} />
    </div>
  );
}

function AdminUploadPage({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [university, setUniversity] = useState('');
  const [campus, setCampus] = useState('');
  const [year, setYear] = useState('Year 1');
  const [cost, setCost] = useState('');
  const [duration, setDuration] = useState('30 Days');
  const [course, setCourse] = useState('');
  const [examPeriod, setExamPeriod] = useState('');
  const [description, setDescription] = useState('');
  const [universities, setUniversities] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  useEffect(() => {
    fetch('/api/universities').then((r) => r.json())
      .then((d) => setUniversities(d.universities || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const selected = universities.find((u) => u.id === university);
    setCampuses(selected?.campuses || []);
    if (!selected) setCampus('');
  }, [university, universities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !university || !campus) {
      setMessage({ text: 'Please fill in all required fields and select a file.', isError: true });
      return;
    }
    setLoading(true);
    setMessage({ text: '', isError: false });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('university', university);
    formData.append('campus', campus);
    formData.append('year', year);
    formData.append('cost', cost || '0');
    formData.append('duration', duration);
    formData.append('course', course);
    formData.append('examPeriod', examPeriod);
    formData.append('description', description);

    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setMessage({ text: '✅ Paper uploaded successfully!', isError: false });
      setUniversity(''); setCampus(''); setCost(''); setFile(null);
      setCourse(''); setExamPeriod(''); setDescription('');
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      onUploadSuccess();
    } catch (error: any) {
      setMessage({ text: error.message || 'Upload failed', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const labelClass = 'block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-2xl">
      {message.text && (
        <div className={`p-4 rounded-2xl mb-6 text-sm font-medium border flex items-center gap-2 ${
          message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>University *</label>
            <select value={university} onChange={(e) => setUniversity(e.target.value)} className={SELECT_CLASS} required>
              <option value="">Select University</option>
              {universities.map((univ) => (<option key={univ.id} value={univ.id}>{univ.name}</option>))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Campus *</label>
            <select value={campus} onChange={(e) => setCampus(e.target.value)} className={`${SELECT_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`} required disabled={!campuses.length}>
              <option value="">Select Campus</option>
              {campuses.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Course Code *</label>
            <input type="text" value={course} onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. MATH 101" className={INPUT_CLASS} required />
          </div>
          <div>
            <label className={labelClass}>Exam Period *</label>
            <input type="text" value={examPeriod} onChange={(e) => setExamPeriod(e.target.value)}
              placeholder="e.g. December 2023" className={INPUT_CLASS} required />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the paper..."
            className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all text-sm font-medium"
            rows={3} />
        </div>

        <div>
          <label className={labelClass}>Year *</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={SELECT_CLASS}>
            {['Year 1','Year 2','Year 3','Year 4','Year 5'].map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Cost (KES)</label>
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)}
              placeholder="0 for free" min="0"
              className={INPUT_CLASS} />
          </div>
          <div>
            <label className={labelClass}>Access Duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className={SELECT_CLASS}>
              {['24 Hours','7 Days','30 Days','1 Semester','Lifetime'].map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>File Upload *</label>
          <div className="relative">
            <input id="file-input" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gradient-to-r file:from-indigo-600 file:to-fuchsia-600 file:text-white hover:file:from-indigo-500 hover:file:to-fuchsia-500 file:cursor-pointer file:transition-all cursor-pointer bg-white rounded-xl border-2 border-indigo-200 hover:border-indigo-300 p-3 transition-all"
              required />
          </div>
          {file && (
            <p className="mt-2 text-xs text-indigo-600 font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <button type="submit" disabled={loading}
          className={`w-full py-4 rounded-xl font-bold text-sm text-white transition-all ${
            loading
              ? 'bg-indigo-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99]'
          }`}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Uploading…
            </span>
          ) : '↑ Upload Paper'}
        </button>
      </div>
    </form>
  );
}
