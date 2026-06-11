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

const CATEGORY_FILTERS = ['All', 'Free', 'Paid', 'Popular', 'Recent'];

export default function MarketplacePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUniv, setSelectedUniv] = useState('');
  const [purchasedPapers, setPurchasedPapers] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState<Paper | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [buyingPaper, setBuyingPaper] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{ status: 'loading' | 'success' | 'error'; message: string } | null>(null);
  const [downloadingPaper, setDownloadingPaper] = useState<string | null>(null);
  const [message, setMessage] = useState({ text: '', isError: false });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const purchased = localStorage.getItem('purchasedPapers');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    setUser(JSON.parse(userData));
    if (purchased) {
      try { setPurchasedPapers(JSON.parse(purchased)); } catch {}
    }

    Promise.all([
      fetch('/api/papers').then((r) => r.json()),
      fetch('/api/universities').then((r) => r.json()),
    ]).then(([papersData, univData]) => {
      setPapers(papersData.papers || []);
      setUniversities(univData.universities || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [router]);

  const getUniversityName = (id: string) =>
    universities.find((u) => u.id === id)?.name || id;

  const hasAccess = (paper: Paper) =>
    paper.cost === 0 || purchasedPapers.includes(paper.id);

  const filteredPapers = papers.filter((p) => {
    const matchesQuery =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUniversityName(p.university).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUniv = !selectedUniv || p.university === selectedUniv;

    const matchesCategory =
      category === 'All' ||
      (category === 'Free' && p.cost === 0) ||
      (category === 'Paid' && p.cost > 0) ||
      (category === 'Popular' && p.totalDownloads > 0) ||
      (category === 'Recent');

    return matchesQuery && matchesUniv && matchesCategory;
  }).sort((a, b) => {
    if (category === 'Popular') return (b.totalDownloads || 0) - (a.totalDownloads || 0);
    if (category === 'Recent') return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
    return 0;
  });

  const featuredPapers = [...papers]
    .sort((a, b) => (b.totalDownloads || 0) - (a.totalDownloads || 0))
    .slice(0, 3);

  const handlePurchase = (paper: Paper) => {
    setShowPaymentModal(paper);
    setPaymentStatus(null);
    setPhoneNumber(user?.phone || '');
  };

  const submitMpesaPayment = async () => {
    if (!showPaymentModal || !phoneNumber) return;
    const paper = showPaymentModal;
    setBuyingPaper(paper.id);
    setPaymentStatus({ status: 'loading', message: 'Initiating M-Pesa STK Push…' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          phoneNumber,
          amount: paper.cost,
          accountReference: paper.id.substring(0, 10),
          transactionDesc: `StudyPal: ${paper.course}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment failed');
      setPaymentStatus({ status: 'success', message: '✅ STK Push sent! Check your phone and enter your M-Pesa PIN.' });
      setTimeout(() => {
        const updated = [...purchasedPapers, paper.id];
        setPurchasedPapers(updated);
        localStorage.setItem('purchasedPapers', JSON.stringify(updated));
        setShowPaymentModal(null);
        setMessage({ text: `Payment initiated for "${paper.title}". Complete on your phone.`, isError: false });
      }, 3000);
    } catch (error: any) {
      setPaymentStatus({ status: 'error', message: error.message || 'Payment failed' });
    } finally {
      setBuyingPaper(null);
    }
  };

  const handleDownload = async (paper: Paper) => {
    setDownloadingPaper(paper.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/papers/${paper.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json();
        setMessage({ text: err.error || 'Download failed', isError: true });
        return;
      }
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        setMessage({ text: 'Paper accessible — file download coming soon.', isError: false });
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `${paper.course}_${paper.examPeriod}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ text: `"${paper.title}" downloaded!`, isError: false });
    } catch (error: any) {
      setMessage({ text: error.message || 'Download failed', isError: true });
    } finally {
      setDownloadingPaper(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm">
                {user.fullName?.charAt(0).toUpperCase()}
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
            { href: '/papers', label: 'Browse Library', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { href: '/marketplace', label: 'Marketplace', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', active: true },
            { href: '/dashboard/profile', label: 'Edit Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          ].map((link) => (
            <Link key={link.href} href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                link.active ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
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
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/auth/login'); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
          <span className="font-bold text-slate-900">StudyPal Marketplace</span>
          <span className="text-sm text-slate-500">{user?.fullName}</span>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-700 p-8 sm:p-10 mb-8 shadow-xl shadow-fuchsia-500/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-20 w-40 h-40 bg-fuchsia-400/20 rounded-full -mb-10" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-widest mb-3">🛍️ Marketplace</span>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">Discover Academic Resources</h2>
                  <p className="text-fuchsia-200 text-base">Browse, purchase and download papers from all Kenyan universities.</p>
                </div>
                <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center flex-shrink-0">
                  <p className="text-fuchsia-200 text-xs font-bold uppercase tracking-widest mb-1">Available</p>
                  <p className="text-4xl font-black text-white">{papers.length}</p>
                  <p className="text-fuchsia-200 text-xs">Papers</p>
                </div>
              </div>
            </div>

            {/* Message */}
            {message.text && (
              <div className={`p-4 rounded-2xl mb-6 border text-sm font-medium flex items-center gap-2 animate-fade-in ${
                message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {message.text}
                <button onClick={() => setMessage({ text: '', isError: false })} className="ml-auto opacity-60 hover:opacity-100">✕</button>
              </div>
            )}

            {/* Featured Papers */}
            {featuredPapers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-amber-500">🔥</span> Trending Papers
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {featuredPapers.map((paper, idx) => (
                    <div key={paper.id} className={`relative rounded-2xl p-5 shadow-lg overflow-hidden ${
                      idx === 0 ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white' :
                      idx === 1 ? 'bg-gradient-to-br from-fuchsia-600 to-pink-700 text-white' :
                      'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                    }`}>
                      <div className="absolute top-3 right-3 text-2xl opacity-30">#{idx + 1}</div>
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-bold mb-3">{paper.course}</span>
                      <h4 className="font-bold text-sm mb-1 line-clamp-2">{paper.title}</h4>
                      <p className="text-white/70 text-xs mb-3">{paper.examPeriod} • {paper.totalDownloads} downloads</p>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-lg">{paper.cost === 0 ? 'FREE' : `KES ${paper.cost}`}</span>
                        {hasAccess(paper) ? (
                          <button onClick={() => handleDownload(paper)} disabled={downloadingPaper === paper.id}
                            className="text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-all">
                            {downloadingPaper === paper.id ? '…' : '↓ Download'}
                          </button>
                        ) : (
                          <button onClick={() => handlePurchase(paper)}
                            className="text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-all">
                            Buy Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search & Filters */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, course, or university…"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-indigo-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all placeholder:text-slate-400"
                  />
                </div>
                <select
                  value={selectedUniv}
                  onChange={(e) => setSelectedUniv(e.target.value)}
                  className="px-4 py-2.5 bg-white border-2 border-indigo-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                >
                  <option value="">All Universities</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              {/* Category Pills */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_FILTERS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      category === cat
                        ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-md shadow-indigo-500/25'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500 font-medium">
                <span className="font-bold text-slate-900">{filteredPapers.length}</span> papers found
              </p>
            </div>

            {/* Papers Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1,2,3,4,5,6,7,8].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                    <div className="h-6 w-20 bg-slate-200 rounded mb-3" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-slate-100 rounded mb-4" />
                    <div className="h-9 bg-slate-200 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-fuchsia-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No papers found</h3>
                <p className="text-slate-500 text-sm">Try a different search or category filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPapers.map((paper) => {
                  const free = paper.cost === 0;
                  const accessible = hasAccess(paper);
                  return (
                    <div key={paper.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-200 group flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-bold">{paper.course}</span>
                        {free ? (
                          <span className="inline-flex px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">FREE</span>
                        ) : accessible ? (
                          <span className="inline-flex px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">✓ Purchased</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-[10px] font-bold">KES {paper.cost}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors flex-1">{paper.title}</h4>
                      <div className="space-y-1 mb-3">
                        <p className="text-[10px] text-slate-400">{getUniversityName(paper.university)}</p>
                        <p className="text-[10px] text-slate-400">{paper.examPeriod} • {paper.yearOfStudy}</p>
                        <p className="text-[10px] text-slate-400">{paper.totalDownloads || 0} downloads • {paper.fileSize || 'N/A'}</p>
                      </div>
                      <div className="mt-auto">
                        {accessible ? (
                          <button onClick={() => handleDownload(paper)} disabled={downloadingPaper === paper.id}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[10px] font-bold py-2 transition-all disabled:opacity-60">
                            {downloadingPaper === paper.id ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />Downloading…</> : <>↓ Download</>}
                          </button>
                        ) : (
                          <button onClick={() => handlePurchase(paper)}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white text-[10px] font-bold py-2 transition-all">
                            🛒 Buy — KES {paper.cost}
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Pay via M-Pesa</h3>
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{showPaymentModal.title}</p>
              </div>
              <button onClick={() => { setShowPaymentModal(null); setPaymentStatus(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">✕</button>
            </div>
            <div className="bg-gradient-to-r from-fuchsia-50 to-violet-50 border border-fuchsia-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Amount</p>
                <p className="text-3xl font-black text-fuchsia-700">KES {showPaymentModal.cost}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-fuchsia-100 flex items-center justify-center text-2xl">🛒</div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">M-Pesa Phone Number</label>
              <input
                type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full px-4 py-3 bg-white border-2 border-fuchsia-200 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all placeholder:text-slate-400"
              />
            </div>
            {paymentStatus && (
              <div className={`mb-4 rounded-xl p-3.5 text-sm font-medium border flex items-center gap-2 ${
                paymentStatus.status === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                paymentStatus.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}>
                {paymentStatus.status === 'loading' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />}
                {paymentStatus.message}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={submitMpesaPayment} disabled={buyingPaper === showPaymentModal.id || !phoneNumber || paymentStatus?.status === 'success'}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-bold text-sm py-3 transition-all shadow-lg shadow-fuchsia-500/25 disabled:opacity-50">
                {buyingPaper === showPaymentModal.id ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Sending…</> : `Pay KES ${showPaymentModal.cost}`}
              </button>
              <button onClick={() => { setShowPaymentModal(null); setPaymentStatus(null); }}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all">Cancel</button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">STK push will be sent to your M-Pesa number.</p>
          </div>
        </div>
      )}
    </div>
  );
}
