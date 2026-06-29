'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AdminStats = {
  paperCount: number;
  universityCount: number;
  studentCount: number;
  activeSubscriptionCount: number;
  pendingPaymentCount: number;
  paperRevenue: number;
  marketplaceRevenue: number;
  totalRevenue: number;
};

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
  const [studentCount, setStudentCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) setIsLoggedIn(true);
    setLoading(false);
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        setStatsError('Admin token is missing. Please sign in again.');
        return;
      }

      setStatsLoading(true);
      setStatsError('');

      const response = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data: AdminStats = await response.json();

      if (!response.ok) {
        throw new Error((data as any)?.error || 'Failed to load live dashboard data.');
      }

      setPaperCount(data.paperCount || 0);
      setUniversityCount(data.universityCount || 0);
      setStudentCount(data.studentCount || 0);
      setRevenue(data.totalRevenue || 0);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Failed to load admin stats:', error);
      setStatsError(error?.message || 'Failed to load live dashboard data.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || tab !== 'dashboard') return;

    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000);

    return () => clearInterval(interval);
  }, [isLoggedIn, tab, fetchDashboardStats]);

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
      fetchDashboardStats();
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
            { key: 'store', label: 'Manage Store', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
            { key: 'ads', label: 'Manage Ads', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
            { key: 'notices', label: 'Manage Notices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { key: 'students', label: 'Students', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
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
                  <div className="relative z-10 flex items-start justify-between gap-6">
                    <div>
                      <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">Admin Dashboard</p>
                      <h2 className="text-3xl font-black text-white mb-1">Platform Overview</h2>
                      <p className="text-indigo-200">Live metrics and statistics for StudyPal.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20">
                      <span className={`h-2 w-2 rounded-full ${statsLoading ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300'}`} />
                      {statsLoading ? 'Syncing' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Ready'}
                    </div>
                  </div>
                </div>

                {statsError && (
                  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {statsError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                  { label: 'Total Papers', value: paperCount, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-indigo-600', bg: 'bg-indigo-50', display: statsLoading ? '...' : String(paperCount) },
                  { label: 'Universities', value: universityCount, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', display: statsLoading ? '...' : String(universityCount) },
                  { label: 'Total Revenue', value: revenue, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-600', bg: 'bg-emerald-50', display: statsLoading ? '...' : `KES ${revenue.toLocaleString()}` },
                  { label: 'Registered Students', value: studentCount, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-sky-600', bg: 'bg-sky-50', display: statsLoading ? '...' : String(studentCount) },
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

          {tab === 'store' && (
            <StoreManager adminToken={localStorage.getItem('adminToken') || ''} />
          )}

          {tab === 'ads' && (
            <AdsManager adminToken={localStorage.getItem('adminToken') || ''} />
          )}

          {tab === 'notices' && (
            <NoticesManager adminToken={localStorage.getItem('adminToken') || ''} />
          )}

          {tab === 'students' && (
            <StudentsManager adminToken={localStorage.getItem('adminToken') || ''} />
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCampusName, setEditCampusName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchUniversities(); }, []);

  const fetchUniversities = async () => {
    try {
      const res = await fetch('/api/universities');
      const data = await res.json();
      setUniversities(data.universities || []);
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    } finally { setLoading(false); }
  };

  const showMsg = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 3500);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name, campuses: campusName ? [{ id: `c_${Date.now()}`, name: campusName, location: '' }] : [] }),
      });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error || 'Failed to add university', true); return; }
      showMsg('✅ University added successfully!');
      setName(''); setCampusName(''); setShowForm(false);
      fetchUniversities();
    } catch (err: any) { showMsg(err.message || 'Connection error', true); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async (univ: any) => {
    if (!editName.trim()) return;
    setSubmitting(true);
    const newCampuses = editCampusName.trim()
      ? [...(univ.campuses || []), { id: `c_${Date.now()}`, name: editCampusName.trim(), location: '' }]
      : univ.campuses || [];
    try {
      const res = await fetch('/api/universities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ id: univ.id, name: editName, campuses: newCampuses }),
      });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error || 'Failed to update', true); return; }
      showMsg('✅ University updated successfully!');
      setEditingId(null); setEditName(''); setEditCampusName('');
      fetchUniversities();
    } catch (err: any) { showMsg(err.message || 'Connection error', true); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this university? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/universities?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error || 'Failed to delete university', true); return; }
      showMsg('✅ University deleted successfully.');
      fetchUniversities();
    } catch (err: any) { showMsg(err.message || 'Connection error', true); }
    finally { setDeletingId(null); }
  };

  const btnClass = 'px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg';

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Manage Universities</h2>
          <p className="text-slate-500 mt-1">Add, edit, and remove university profiles</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`${btnClass} ${showForm ? 'bg-slate-200 text-slate-700' : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-indigo-500/25 hover:scale-105'}`}>
          {showForm ? 'Cancel' : '+ Add University'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl mb-6 border text-sm font-medium flex items-center gap-2 ${message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Add New University</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">University Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Egerton University" className={INPUT_CLASS} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">First Campus (optional)</label>
              <input type="text" value={campusName} onChange={(e) => setCampusName(e.target.value)} placeholder="e.g. Main Campus" className={INPUT_CLASS} />
            </div>
            <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-lg transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Adding university...' : 'Add University'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse h-28" />)}
        </div>
      ) : universities.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No universities added yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {universities.map(univ => (
            <div key={univ.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-200 hover:shadow-md transition-all">
              {editingId === univ.id ? (
                <div className="space-y-3">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    placeholder="University name" className={INPUT_CLASS} disabled={submitting} />
                  <input type="text" value={editCampusName} onChange={(e) => setEditCampusName(e.target.value)}
                    placeholder="Add new campus (optional)" className={INPUT_CLASS} disabled={submitting} />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleEdit(univ)} disabled={submitting}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {submitting ? 'Saving...' : '✓ Save'}
                    </button>
                    <button onClick={() => { setEditingId(null); setEditName(''); setEditCampusName(''); }} disabled={submitting}
                      className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 mb-2">{univ.name}</h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {univ.campuses?.map((c: any) => (
                        <span key={c.id || c.name} className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">📍 {c.name}</span>
                      ))}
                      {(!univ.campuses || univ.campuses.length === 0) && <span className="text-xs text-slate-400">No campuses</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(univ.id); setEditName(univ.name); setEditCampusName(''); }} disabled={deletingId !== null}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDelete(univ.id)} disabled={deletingId !== null}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {deletingId === univ.id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

// ── Store Manager Component ──
function StoreManager({ adminToken }: { adminToken: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('Good');
  const [category, setCategory] = useState('Electronics');
  const [contactInfo, setContactInfo] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/marketplace/items');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const showMsg = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 3500);
  };

  const handleToggleStatus = async (itemId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'available' ? 'sold' : 'available';
    setUpdatingItemId(itemId);
    setMessage({ text: '', isError: false });
    try {
      const res = await fetch('/api/marketplace/items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id: itemId, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`✅ Item status updated to ${nextStatus}!`);
        fetchItems();
      } else {
        showMsg(data.error || 'Failed to update status', true);
      }
    } catch (err: any) {
      showMsg(err.message || 'Error updating status', true);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this marketplace item?')) return;
    setDeletingItemId(itemId);
    setMessage({ text: '', isError: false });
    try {
      const res = await fetch(`/api/marketplace/items?id=${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('✅ Marketplace item deleted successfully!');
        fetchItems();
      } else {
        showMsg(data.error || 'Failed to delete item', true);
      }
    } catch (err: any) {
      showMsg(err.message || 'Error deleting item', true);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('condition', condition);
      formData.append('category', category);
      formData.append('contactInfo', contactInfo);
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch('/api/marketplace/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload item');

      setMessage({ text: '✅ Marketplace item added successfully!', isError: false });
      setTitle('');
      setDescription('');
      setPrice('');
      setContactInfo('');
      setFile(null);
      
      const fileInput = document.getElementById('item-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchItems();
    } catch (err: any) {
      setMessage({ text: err.message || 'Upload failed', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Add Marketplace Item (New/Second Hand)</h2>
        
        {message.text && (
          <div className={`mb-6 rounded-2xl p-4 text-sm font-medium border flex items-center gap-2 ${
            message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Item Name *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scientific Calculator FX-991" className={INPUT_CLASS} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Price (KES) *</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 1500" className={INPUT_CLASS} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT_CLASS}>
                {['Calculators', 'Furniture', 'Electronics', 'Textbooks', 'Others'].map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Condition *</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className={SELECT_CLASS}>
                {['New', 'Like New', 'Good', 'Fair', 'Poor'].map((cond) => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Seller Contact Details *</label>
              <input type="text" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g. Phone 0712345678" className={INPUT_CLASS} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Product Image *</label>
              <input id="item-file-input" type="file" accept="image/*"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gradient-to-r file:from-indigo-600 file:to-fuchsia-600 file:text-white file:cursor-pointer file:transition-all cursor-pointer bg-white rounded-xl border-2 border-indigo-200 hover:border-indigo-300 p-2.5 transition-all"
                required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item (condition, features, pickup location...)"
              className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all text-sm font-medium"
              rows={3} required />
          </div>

          <button type="submit" disabled={submitting}
            className={`w-full py-4 rounded-xl font-bold text-sm text-white transition-all ${
              submitting ? 'bg-indigo-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 shadow-lg shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99]'
            }`}>
            {submitting ? 'Adding Item…' : 'Add Item to Marketplace'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6">Current Items for Sale</h3>
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">Loading items...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No items uploaded yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {items.map((i) => (
              <div key={i.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="h-32 bg-slate-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative">
                    {i.telegramFileId ? (
                      <img src={`/api/media/telegram/${i.telegramFileId}`} alt={i.title} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-slate-400 text-xs">No Image Preview</span>
                    )}
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold">{i.category}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{i.condition}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{i.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{i.description}</p>
                </div>
                <div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    <span className="font-black text-slate-900 text-sm">KES {i.price}</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase ${i.status === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{i.status}</span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleToggleStatus(i.id, i.status)}
                      disabled={updatingItemId !== null || deletingItemId !== null}
                      className="flex-1 text-[11px] font-bold py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingItemId === i.id ? 'Updating...' : `🔄 Mark ${i.status === 'available' ? 'Sold' : 'Available'}`}
                    </button>
                    <button
                      onClick={() => handleDeleteItem(i.id)}
                      disabled={updatingItemId !== null || deletingItemId !== null}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Item"
                    >
                      {deletingItemId === i.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ads Manager Component ──
function AdsManager({ adminToken }: { adminToken: string }) {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [updatingAdId, setUpdatingAdId] = useState<string | null>(null);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');

  const fetchAds = async () => {
    try {
      const res = await fetch('/api/marketplace/advertisements?all=true');
      const data = await res.json();
      setAds(data.advertisements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const showMsg = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 3500);
  };

  const handleToggleAdStatus = async (adId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setUpdatingAdId(adId);
    setMessage({ text: '', isError: false });
    try {
      const res = await fetch('/api/marketplace/advertisements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id: adId, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`✅ Advertisement status updated to ${nextStatus}!`);
        fetchAds();
      } else {
        showMsg(data.error || 'Failed to update status', true);
      }
    } catch (err: any) {
      showMsg(err.message || 'Error updating status', true);
    } finally {
      setUpdatingAdId(null);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    setDeletingAdId(adId);
    setMessage({ text: '', isError: false });
    try {
      const res = await fetch(`/api/marketplace/advertisements?id=${adId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('✅ Advertisement banner deleted successfully!');
        fetchAds();
      } else {
        showMsg(data.error || 'Failed to delete advertisement', true);
      }
    } catch (err: any) {
      showMsg(err.message || 'Error deleting advertisement', true);
    } finally {
      setDeletingAdId(null);
    }
  };

  const handleEditAd = async (ad: any) => {
    if (!editTitle.trim()) return;
    setSubmitting(true);
    setMessage({ text: '', isError: false });
    try {
      const res = await fetch('/api/marketplace/advertisements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: ad.id,
          title: editTitle,
          description: editDescription,
          linkUrl: editLinkUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('✅ Advertisement updated successfully!');
        setEditingId(null);
        fetchAds();
      } else {
        showMsg(data.error || 'Failed to update advertisement', true);
      }
    } catch (err: any) {
      showMsg(err.message || 'Error updating advertisement', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('linkUrl', linkUrl);
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch('/api/marketplace/advertisements', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload ad');

      setMessage({ text: '✅ Advertisement banner successfully added!', isError: false });
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setFile(null);
      
      const fileInput = document.getElementById('ad-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchAds();
    } catch (err: any) {
      setMessage({ text: err.message || 'Upload failed', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Upload Banner Advertisement</h2>
        
        {message.text && (
          <div className={`mb-6 rounded-2xl p-4 text-sm font-medium border flex items-center gap-2 ${
            message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Ad Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tech Internships 2026" className={INPUT_CLASS} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Action Link URL</label>
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="e.g. https://company.com/apply" className={INPUT_CLASS} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Banner Image *</label>
            <input id="ad-file-input" type="file" accept="image/*"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gradient-to-r file:from-indigo-600 file:to-fuchsia-600 file:text-white file:cursor-pointer file:transition-all cursor-pointer bg-white rounded-xl border-2 border-indigo-200 hover:border-indigo-300 p-2.5 transition-all"
              required />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Short Tagline/Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Apply before August 1st for the executive cohort program"
              className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all text-sm font-medium"
              rows={2} />
          </div>

          <button type="submit" disabled={submitting}
            className={`w-full py-4 rounded-xl font-bold text-sm text-white transition-all ${
              submitting ? 'bg-indigo-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 shadow-lg shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99]'
            }`}>
            {submitting ? 'Uploading Ad…' : 'Publish Banner Ad'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6">Published Banner Advertisements</h3>
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">Loading ads...</p>
        ) : ads.length === 0 ? (
          <p className="text-sm text-slate-500">No active ads published yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {ads.map((ad) => (
              <div key={ad.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="h-32 bg-slate-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative">
                    {ad.telegramFileId ? (
                      <img 
                        src={`/api/media/telegram/${ad.telegramFileId}`} 
                        alt={ad.title} 
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const span = parent.querySelector('.img-error');
                            if (span) (span as HTMLSpanElement).style.display = 'block';
                          }
                        }}
                      />
                    ) : (
                      <span className="text-slate-400 text-xs">No Image Preview</span>
                    )}
                    <span className="img-error text-slate-400 text-xs hidden">Image unavailable</span>
                  </div>
                </div>
                <div className="mt-2">
                  {editingId === ad.id ? (
                    <div className="space-y-2">
                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Ad title" className={INPUT_CLASS} />
                      <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description" className={INPUT_CLASS} />
                      <input type="url" value={editLinkUrl} onChange={(e) => setEditLinkUrl(e.target.value)}
                        placeholder="Link URL" className={INPUT_CLASS} />
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 text-sm mb-1">{ad.title}</h4>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase ${ad.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{ad.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{ad.description}</p>
                    </div>
                  )}
                </div>
                <div>
                  {editingId === ad.id ? (
                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleEditAd(ad)}
                        disabled={submitting}
                        className="flex-1 text-[11px] font-bold py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Saving...' : '✓ Save'}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditTitle(''); setEditDescription(''); setEditLinkUrl(''); }}
                        disabled={submitting}
                        className="flex-1 text-[11px] font-bold py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {ad.linkUrl && (
                        <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline block mb-3">
                          Action Link →
                        </a>
                      )}
                      <div className="flex gap-2 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => { setEditingId(ad.id); setEditTitle(ad.title); setEditDescription(ad.description || ''); setEditLinkUrl(ad.linkUrl || ''); }}
                          disabled={updatingAdId !== null || deletingAdId !== null}
                          className="flex-1 text-[11px] font-bold py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleToggleAdStatus(ad.id, ad.status)}
                          disabled={updatingAdId !== null || deletingAdId !== null}
                          className="flex-1 text-[11px] font-bold py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingAdId === ad.id ? 'Updating...' : '🔄 Toggle State'}
                        </button>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          disabled={updatingAdId !== null || deletingAdId !== null}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Ad"
                        >
                          {deletingAdId === ad.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Students Manager Component ──
function StudentsManager({ adminToken }: { adminToken: string }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/auth/students', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Registered Students</h2>
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-slate-500">No students registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 font-bold text-slate-600">Name</th>
                  <th className="text-left py-3 font-bold text-slate-600">Email</th>
                  <th className="text-left py-3 font-bold text-slate-600">University</th>
                  <th className="text-left py-3 font-bold text-slate-600">Campus</th>
                  <th className="text-left py-3 font-bold text-slate-600">Year</th>
                  <th className="text-left py-3 font-bold text-slate-600">Joined</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-900">{s.fullName}</td>
                    <td className="py-3 text-slate-600">{s.email}</td>
                    <td className="py-3 text-slate-600">{s.university || '-'}</td>
                    <td className="py-3 text-slate-600">{s.campus || '-'}</td>
                    <td className="py-3 text-slate-600">{s.yearOfStudy || '-'}</td>
                    <td className="py-3 text-slate-500">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Notices Manager Component ──
function NoticesManager({ adminToken }: { adminToken: string }) {
  const [notices, setNotices] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Academic');
  const [university, setUniversity] = useState('all');

  const fetchNoticesAndUnivs = async () => {
    try {
      const [noticesRes, univsRes] = await Promise.all([
        fetch('/api/marketplace/notices'),
        fetch('/api/universities'),
      ]);
      const noticesData = await noticesRes.json();
      const univsData = await univsRes.json();
      setNotices(noticesData.notices || []);
      setUniversities(univsData.universities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNoticesAndUnivs();
  }, []);

  const showMsg = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 3500);
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this announcement/notice?')) return;
    setDeletingNoticeId(noticeId);
    setMessage({ text: '', isError: false });
    try {
      const res = await fetch(`/api/marketplace/notices?id=${noticeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('✅ Announcement deleted successfully!');
        fetchNoticesAndUnivs();
      } else {
        showMsg(data.error || 'Failed to delete notice', true);
      }
    } catch (err: any) {
      showMsg(err.message || 'Error deleting notice', true);
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await fetch('/api/marketplace/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title,
          content,
          category,
          university,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post notice');

      setMessage({ text: '✅ Notice posted to announcement board!', isError: false });
      setTitle('');
      setContent('');
      setCategory('Academic');
      setUniversity('all');

      fetchNoticesAndUnivs();
    } catch (err: any) {
      setMessage({ text: err.message || 'Posting failed', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Create Announcement / Notice</h2>
        
        {message.text && (
          <div className={`mb-6 rounded-2xl p-4 text-sm font-medium border flex items-center gap-2 ${
            message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Notice Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Graduation List Approval Schedule" className={INPUT_CLASS} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT_CLASS}>
                {['Academic', 'Events', 'General', 'Jobs'].map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Target University *</label>
            <select value={university} onChange={(e) => setUniversity(e.target.value)} className={SELECT_CLASS}>
              <option value="all">All Universities (Global Notice)</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Announcement Content *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Write the details of the notice..."
              className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all text-sm font-medium"
              rows={4} required />
          </div>

          <button type="submit" disabled={submitting}
            className={`w-full py-4 rounded-xl font-bold text-sm text-white transition-all ${
              submitting ? 'bg-indigo-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 shadow-lg shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99]'
            }`}>
            {submitting ? 'Posting notice…' : 'Publish Notice Announcement'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6">Recent Notices Posted</h3>
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">Loading notices...</p>
        ) : notices.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements published yet.</p>
        ) : (
          <div className="space-y-4">
            {notices.map((n) => {
              const uName = n.university === 'all' ? 'All Universities' : (universities.find((u) => u.id === n.university)?.name || n.university);
              return (
                <div key={n.id} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 text-[10px] font-bold uppercase">{n.category}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{uName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{n.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteNotice(n.id)}
                    disabled={deletingNoticeId !== null}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all text-xs flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete Notice"
                  >
                    {deletingNoticeId === n.id ? 'Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

