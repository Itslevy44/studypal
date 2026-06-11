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
    // Check if admin is already logged in
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      setIsLoggedIn(true);
    }
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
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#030305] p-6">
        <div className="absolute top-[20%] right-[20%] h-[300px] w-[300px] rounded-full bg-emerald-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[20%] h-[300px] w-[300px] rounded-full bg-emerald-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md animate-fade-in">
          <div className="glass-card rounded-[2rem] p-10 shadow-2xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 ring-1 ring-white/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Admin Login</h1>
              <p className="text-slate-400 text-sm">Secure Portal Access</p>
            </div>

            {loginMessage && (
              <div className="mb-6 rounded-xl p-4 text-sm font-medium border backdrop-blur-md bg-red-500/10 border-red-500/20 text-red-400">
                {loginMessage}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300 ml-1">Admin Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
                  required
                />
              </div>

              <button
                type="submit"
                className="glow-primary w-full rounded-xl py-4 text-sm font-semibold text-white transition-all mt-4 bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98]"
              >
                Access Portal
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <span className="font-bold text-slate-900">StudyPal Admin</span>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm flex-shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-md shadow-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
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
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
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
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Overview</h2>
                <p className="text-slate-500 mt-1">Key metrics and statistics for StudyPal.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Papers</p>
                  <p className="text-4xl font-black text-slate-900">{paperCount}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-fuchsia-50 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Universities</p>
                  <p className="text-4xl font-black text-slate-900">{universityCount}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Revenue</p>
                  <p className="text-3xl font-black text-emerald-600">KES {revenue.toLocaleString()}</p>
                </div>
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

function UniversitiesManager({ adminToken }: { adminToken: string }) {
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [campusName, setCampusName] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });

  useEffect(() => {
    fetchUniversities();
  }, []);

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name,
          campuses: campusName ? [{ name: campusName, location: '' }] : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ text: data.error || 'Failed to add university', isError: true });
        return;
      }

      setMessage({ text: 'University added successfully!', isError: false });
      setName('');
      setCampusName('');
      setShowForm(false);
      fetchUniversities();
    } catch (error: any) {
      setMessage({ text: error.message || 'Connection error', isError: true });
    }
  };

  if (loading) {
    return <p>Loading universities...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Manage Universities</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold text-sm transition"
        >
          {showForm ? 'Cancel' : 'Add University'}
        </button>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.isError
              ? 'bg-red-900/50 border border-red-500 text-red-200'
              : 'bg-green-900/50 border border-green-500 text-green-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddUniversity} className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">University Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Egerton University"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">First Campus Name (optional)</label>
              <input
                type="text"
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                placeholder="e.g. Main Campus"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold text-sm transition"
            >
              Add University
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {universities.map((univ) => (
          <div key={univ.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-bold mb-4">{univ.name}</h3>
            <div className="space-y-2">
              {univ.campuses?.map((campus: any) => (
                <div key={campus.id} className="text-sm text-gray-400">
                  • {campus.name} {campus.location && `(${campus.location})`}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaperUploadManager({ adminToken, onUploadSuccess }: { adminToken: string; onUploadSuccess: () => void }) {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Upload Past Paper</h2>
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
    const fetchUniversities = async () => {
      try {
        const response = await fetch('/api/universities');
        const data = await response.json();
        setUniversities(data.universities || []);
      } catch (error) {
        console.error('Failed to load universities for admin upload:', error);
      }
    };
    fetchUniversities();
  }, []);

  useEffect(() => {
    const selectedUniv = universities.find((u) => u.id === university);
    setCampuses(selectedUniv?.campuses || []);
    if (!selectedUniv) {
      setCampus('');
    }
  }, [university, universities]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

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
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setMessage({ text: 'Paper uploaded successfully!', isError: false });
      setUniversity('');
      setCampus('');
      setCost('');
      setFile(null);
      setCourse('');
      setExamPeriod('');
      setDescription('');
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      onUploadSuccess();
    } catch (error: any) {
      setMessage({ text: error.message || 'Upload failed', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg border border-gray-700 p-8 max-w-2xl">
      {message.text && (
        <div
          className={`p-4 rounded-lg mb-6 text-sm font-medium ${
            message.isError
              ? 'bg-red-900/50 border border-red-500 text-red-200'
              : 'bg-green-900/50 border border-green-500 text-green-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              University *
            </label>
            <select
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white text-sm transition"
              required
            >
              <option value="">Select University</option>
              {universities.map((univ) => (
                <option key={univ.id} value={univ.id}>
                  {univ.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Campus *
            </label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white text-sm transition"
              required
              disabled={!campuses.length}
            >
              <option value="">Select Campus</option>
              {campuses.map((campusOption) => (
                <option key={campusOption.id} value={campusOption.name}>
                  {campusOption.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Course Code *
            </label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. MATH 101"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500 text-sm transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Exam Period *
            </label>
            <input
              type="text"
              value={examPeriod}
              onChange={(e) => setExamPeriod(e.target.value)}
              placeholder="e.g. December 2023"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500 text-sm transition"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the paper..."
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500 text-sm transition"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Year *</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white text-sm transition"
          >
            <option value="Year 1">Year 1</option>
            <option value="Year 2">Year 2</option>
            <option value="Year 3">Year 3</option>
            <option value="Year 4">Year 4</option>
            <option value="Year 5">Year 5</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Cost (KES)
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0 for free"
              min="0"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500 text-sm transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Access Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white text-sm transition"
            >
              <option value="24 Hours">24 Hours</option>
              <option value="7 Days">7 Days</option>
              <option value="30 Days">30 Days</option>
              <option value="1 Semester">1 Semester</option>
              <option value="Lifetime">Lifetime</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            File Upload *
          </label>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer bg-gray-900 rounded-lg border border-gray-700 p-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 px-4 rounded-lg font-semibold text-sm transition tracking-wide text-white mt-4 ${
            loading
              ? 'bg-emerald-800 opacity-60 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
          }`}
        >
          {loading ? 'Uploading...' : 'Upload Paper'}
        </button>
      </div>
    </form>
  );
}
