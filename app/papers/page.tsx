'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Paper {
  id: string;
  title: string;
  course: string;
  examPeriod: string;
  yearOfStudy: string;
  cost: number;
  university: string;
  accessDuration: string;
  description: string;
  totalDownloads: number;
  fileSize: string;
  uploadedAt: string;
}

interface University {
  id: string;
  name: string;
}

export default function PapersBrowsePage() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userUniversityName, setUserUniversityName] = useState('');

  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchCourse, setSearchCourse] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState<Paper | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [buyingPaper, setBuyingPaper] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{ status: 'loading' | 'success' | 'error'; message: string } | null>(null);
  const [downloadingPaper, setDownloadingPaper] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', isError: false });
  // Track which papers the user has purchased (stored after payment success)
  const [purchasedPapers, setPurchasedPapers] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    const fetchFreshUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } catch (e) {
        console.error('Failed to fetch user:', e);
      }
    };
    fetchFreshUser();

    // Default to user's university
    const userUniv = parsedUser.university || '';
    setSelectedUniversity(userUniv);

    fetchUniversities(userUniv);
    fetchPapers(userUniv, '', '');
  }, [router]);

  const fetchUniversities = async (currentUserUnivId?: string) => {
    try {
      const response = await fetch('/api/universities');
      const data = await response.json();
      const univList: University[] = data.universities || [];
      setUniversities(univList);
      if (currentUserUnivId) {
        const found = univList.find((u) => u.id === currentUserUnivId);
        setUserUniversityName(found?.name || '');
      }
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    }
  };

  const fetchPapers = async (univFilter = '', yearFilter = '', courseFilter = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (univFilter) params.append('university', univFilter);
      if (yearFilter) params.append('year', yearFilter);
      if (courseFilter) params.append('course', courseFilter);

      const response = await fetch(`/api/papers?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load papers');
      setPapers(data.papers || []);
      setMessage({ text: '', isError: false });
    } catch (error: any) {
      setMessage({ text: error?.message || 'Failed to load papers', isError: true });
      setPapers([]);
    } finally {
      setLoading(false);
    }
  };

  const getUniversityName = (id: string) => {
    return universities.find((u) => u.id === id)?.name || id;
  };

  const handleFilter = () => {
    fetchPapers(selectedUniversity, selectedYear, searchCourse);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFilter();
  };

  const handlePurchase = (paper: Paper) => {
    setShowPaymentModal(paper);
    setPaymentStatus(null);
    setPhoneNumber(user?.phone || '');
    setMessage({ text: '', isError: false });
  };

  const hasAccess = (paper: Paper) => {
    return paper.cost === 0 || !!user?.hasActiveSubscription;
  };

  const submitMpesaPayment = async () => {
    if (!showPaymentModal) return;
    const paper = showPaymentModal;

    if (!phoneNumber) {
      setPaymentStatus({ status: 'error', message: 'Please enter your M-Pesa phone number.' });
      return;
    }

    setBuyingPaper(paper.id);
    setPaymentStatus({ status: 'loading', message: 'Initiating M-Pesa STK Push…' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          phoneNumber,
          amount: 100,
          accountReference: 'all_access',
          transactionDesc: 'StudyPal: 3-Month All-Access Pass',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to initiate payment');

      setPaymentStatus({
        status: 'success',
        message: '✅ STK Push sent! Check your phone and enter your M-Pesa PIN to complete payment.',
      });

      // Optimistically grant access after a few seconds (real access granted via callback)
      setTimeout(() => {
        const updated = { ...user, hasActiveSubscription: true };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        setShowPaymentModal(null);
        setMessage({ text: `Payment initiated successfully. Check your phone to complete.`, isError: false });
      }, 3000);
    } catch (error: any) {
      setPaymentStatus({ status: 'error', message: error?.message || 'Payment initiation failed.' });
    } finally {
      setBuyingPaper(null);
    }
  };

  const handleDownload = async (paper: Paper) => {
    setDownloadingPaper(paper.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/papers/${paper.id}/download`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });

      if (!response.ok) {
        const err = await response.json();
        setMessage({ text: err.error || 'Download failed', isError: true });
        return;
      }

      // Check if it's a JSON response (no file available) or binary
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        setMessage({ text: 'Paper available — file storage coming soon.', isError: false });
        return;
      }

      // Stream download
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `${paper.course}_${paper.examPeriod}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ text: `"${paper.title}" downloaded successfully!`, isError: false });
    } catch (error: any) {
      setMessage({ text: error?.message || 'Download failed', isError: true });
    } finally {
      setDownloadingPaper(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar — reusing dashboard sidebar style */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm flex-shrink-0">
        <div className="p-6 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">StudyPal</h1>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Student Portal</p>
            </div>
          </Link>
        </div>

        {user && (
          <div className="p-4 mx-4 mt-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-fuchsia-50 border border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-xs text-indigo-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 mt-2">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { href: '/papers', label: 'Browse Library', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', active: true },
            { href: '/marketplace', label: 'Marketplace', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
            { href: '/dashboard/profile', label: 'Edit Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                link.active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
              </svg>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              router.push('/auth/login');
            }}
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
          <Link href="/dashboard" className="font-bold text-slate-900 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            StudyPal
          </Link>
          <span className="text-sm text-slate-500">{user?.fullName}</span>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900">Browse Past Papers</h1>
                {userUniversityName && (
                  <p className="text-slate-500 mt-1 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Showing papers from <span className="font-semibold text-indigo-600">{userUniversityName}</span>
                  </p>
                )}
              </div>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white px-5 py-2.5 font-bold text-sm shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:scale-105 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Marketplace
              </Link>
            </div>

            {/* Message */}
            {message.text && (
              <div className={`p-4 rounded-2xl mb-6 border text-sm font-medium flex items-center gap-2 animate-fade-in ${
                message.isError
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={message.isError ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                </svg>
                {message.text}
                <button onClick={() => setMessage({ text: '', isError: false })} className="ml-auto text-current opacity-60 hover:opacity-100">✕</button>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-8 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Papers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">University</label>
                  <select
                    value={selectedUniversity}
                    onChange={(e) => setSelectedUniversity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border-2 border-indigo-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                  >
                    <option value="">All Universities</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border-2 border-indigo-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                  >
                    <option value="">All Years</option>
                    {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Search Course</label>
                  <input
                    type="text"
                    value={searchCourse}
                    onChange={(e) => setSearchCourse(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. MATH 101"
                    className="w-full px-3 py-2.5 bg-white border-2 border-indigo-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={handleFilter}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 rounded-xl font-bold text-sm text-white transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                  >
                    Filter
                  </button>
                  {(selectedUniversity !== (user?.university || '') || selectedYear || searchCourse) && (
                    <button
                      onClick={() => {
                        const userUniv = user?.university || '';
                        setSelectedUniversity(userUniv);
                        setSelectedYear('');
                        setSearchCourse('');
                        fetchPapers(userUniv, '', '');
                      }}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all"
                      title="Reset filters"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Papers Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                    <div className="flex justify-between mb-3">
                      <div className="h-6 w-20 bg-slate-200 rounded-lg" />
                      <div className="h-6 w-16 bg-slate-200 rounded-full" />
                    </div>
                    <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-slate-200 rounded mb-4" />
                    <div className="space-y-2 mb-4">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="h-3 w-full bg-slate-100 rounded" />
                      ))}
                    </div>
                    <div className="h-9 bg-slate-200 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : papers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No Papers Found</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  No papers match your current filters. Try adjusting the university or year.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {papers.map((paper) => {
                  const free = paper.cost === 0;
                  const accessible = hasAccess(paper);
                  const isDownloading = downloadingPaper === paper.id;

                  return (
                    <div key={paper.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-200 group flex flex-col">
                      {/* Top Row */}
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                          {paper.course}
                        </span>
                        {free ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                            FREE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-bold">
                            KES {paper.cost}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors flex-1">
                        {paper.title}
                      </h3>

                      {/* Meta */}
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="font-medium">{getUniversityName(paper.university)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <svg className="w-3.5 h-3.5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{paper.examPeriod} • {paper.yearOfStudy}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{paper.fileSize}</span>
                          <span>•</span>
                          <span>{paper.totalDownloads} downloads</span>
                        </div>
                      </div>

                      {paper.description && (
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{paper.description}</p>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-auto">
                        {accessible ? (
                          <button
                            onClick={() => handleDownload(paper)}
                            disabled={isDownloading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold py-2.5 transition-all shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:opacity-60"
                          >
                            {isDownloading ? (
                              <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Downloading…
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {free ? 'Download Free' : 'Download'}
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePurchase(paper)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white text-xs font-bold py-2.5 transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Unlock All — KES 100
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Payment Modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Pay via M-Pesa</h3>
                <p className="text-sm text-slate-500 mt-0.5">3-Month All-Access Pass</p>
              </div>
              <button
                onClick={() => { setShowPaymentModal(null); setPaymentStatus(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Price Tag */}
            <div className="bg-gradient-to-r from-indigo-50 to-fuchsia-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Access Duration</p>
                <p className="text-3xl font-black text-indigo-700">KES 100 <span className="text-sm font-normal text-slate-500">/ 3 Months</span></p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Phone Input */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">M-Pesa Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0712345678 or 254712345678"
                className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Status */}
            {paymentStatus && (
              <div className={`mb-4 rounded-xl p-3.5 text-sm font-medium border flex items-start gap-2 animate-fade-in ${
                paymentStatus.status === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : paymentStatus.status === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}>
                {paymentStatus.status === 'loading' && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700 flex-shrink-0 mt-0.5" />
                )}
                {paymentStatus.message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={submitMpesaPayment}
                disabled={buyingPaper === showPaymentModal.id || !phoneNumber || paymentStatus?.status === 'success'}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold text-sm py-3 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buyingPaper === showPaymentModal.id ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Pay KES 100
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowPaymentModal(null); setPaymentStatus(null); }}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-4">
              You&apos;ll receive an STK push on your phone to confirm payment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
