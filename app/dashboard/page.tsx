'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { savePaperOffline } from '@/lib/indexedDB';

interface User {
  id: string;
  email: string;
  fullName: string;
  university: string;
  campus: string;
  yearOfStudy: string;
}

interface Paper {
  id: string;
  title: string;
  course: string;
  examPeriod: string;
  yearOfStudy: string;
  cost: number;
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

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [paperCount, setPaperCount] = useState(0);
  const [freePaperCount, setFreePaperCount] = useState(0);
  const [universityName, setUniversityName] = useState('');
  const [recentPapers, setRecentPapers] = useState<Paper[]>([]);

  // M-Pesa State
  const [buyingPaper, setBuyingPaper] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhonePrompt, setShowPhonePrompt] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{ id: string; status: 'loading' | 'success' | 'error'; message: string } | null>(null);
  const [downloadingPaper, setDownloadingPaper] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }
    const parsedUser: User = JSON.parse(userData);
    setUser(parsedUser);

    const fetchPageData = async () => {
      try {
        // Fetch fresh user data to see if they have an active subscription
        const meResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        let freshUser = parsedUser;
        if (meResponse.ok) {
          const meData = await meResponse.json();
          if (meData.success && meData.user) {
            freshUser = meData.user;
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          }
        }

        const [papersRes, universitiesRes] = await Promise.all([
          fetch('/api/papers'),
          fetch('/api/universities'),
        ]);
        const papersData = await papersRes.json();
        const universitiesData = await universitiesRes.json();
        const papers: Paper[] = papersData.papers || [];
        setPaperCount(papers.length);
        setFreePaperCount(papers.filter((p) => p.cost === 0).length);
        setRecentPapers(papers.slice(0, 6));
        const university = (universitiesData.universities || []).find(
          (item: University) => item.id === freshUser.university
        );
        setUniversityName(university?.name || freshUser.university || 'Your University');
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPageData();
  }, [router]);

  const handleBuyClick = (paperId: string) => {
    setShowPhonePrompt(paperId);
    setPaymentStatus(null);
    setPhoneNumber('');
  };

  const [savedPaperId, setSavedPaperId] = useState<string | null>(null);

  const handleDownload = async (paper: Paper) => {
    setDownloadingPaper(paper.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/papers/${paper.id}/download`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || 'Download failed');
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        alert('Paper available — file storage coming soon.');
        return;
      }

      // Save blob to IndexedDB (in-app offline storage) instead of device
      const blob = await response.blob();
      await savePaperOffline({
        id: paper.id,
        title: paper.title,
        course: paper.course,
        examPeriod: paper.examPeriod,
        yearOfStudy: paper.yearOfStudy,
        fileSize: paper.fileSize,
        blob,
      });

      // Show success banner instead of device download
      setSavedPaperId(paper.id);
      setTimeout(() => setSavedPaperId(null), 6000);
    } catch (error: any) {
      alert(error?.message || 'Failed to save paper offline');
    } finally {
      setDownloadingPaper(null);
    }
  };

  const submitMpesaPayment = async (paper: Paper) => {
    if (!phoneNumber) return;
    setBuyingPaper(paper.id);
    setPaymentStatus({ id: paper.id, status: 'loading', message: 'Initiating M-Pesa STK Push…' });
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
      if (!response.ok) throw new Error(data.error || 'Failed to initiate payment');
      setPaymentStatus({ id: paper.id, status: 'success', message: '✓ Check your phone and enter your M-Pesa PIN.' });
    } catch (error: any) {
      setPaymentStatus({ id: paper.id, status: 'error', message: error.message || 'Payment initiation failed.' });
    } finally {
      setBuyingPaper(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">

      {/* Offline save success toast */}
      {savedPaperId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm font-semibold px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>📥 Saved to Offline Downloads!</span>
          <Link href="/dashboard/downloads" className="underline font-bold hover:text-emerald-100 transition-colors ml-1">
            View Now
          </Link>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-fuchsia-700 p-8 sm:p-10 mb-8 shadow-xl shadow-indigo-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-fuchsia-500/20 rounded-full -mb-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-2">Welcome back</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              {user.fullName.split(' ')[0]} 👋
            </h2>
            <p className="text-indigo-200 text-base">
              Ready to study? Your materials from <span className="text-white font-semibold">{universityName}</span> are here.
            </p>
          </div>
          <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Year of Study</p>
            <p className="text-3xl font-black text-white">{user.yearOfStudy}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Papers</p>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900">{paperCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Free Papers</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black text-emerald-600">{freePaperCount}</p>
        </div>
      </div>

      {/* Recent Papers */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">Available Papers</h3>
        <Link href="/papers" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          View all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {recentPapers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recentPapers.map((paper) => (
            <div key={paper.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                  {paper.course}
                </span>
                {paper.cost === 0 ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    Free
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-700 text-xs font-bold">
                    KES {paper.cost}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-2 group-hover:text-indigo-700 transition-colors flex-1">
                {paper.title}
              </h4>
              <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {paper.examPeriod} &bull; Year {paper.yearOfStudy}
              </p>

              {showPhonePrompt === paper.id ? (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">M-Pesa Number</label>
                  <input
                    type="tel"
                    placeholder="254700000000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                  {paymentStatus?.id === paper.id && (
                    <p className={`text-xs font-medium ${paymentStatus.status === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {paymentStatus.message}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => submitMpesaPayment(paper)}
                      disabled={buyingPaper === paper.id || !phoneNumber}
                      className="flex-1 glow-primary bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      {buyingPaper === paper.id ? 'Sending…' : 'Pay via M-Pesa'}
                    </button>
                    <button
                      onClick={() => setShowPhonePrompt(null)}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-auto">
                  {paper.cost === 0 || (user as any)?.hasActiveSubscription ? (
                    <button
                      onClick={() => handleDownload(paper)}
                      disabled={downloadingPaper === paper.id}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold py-2.5 transition-all shadow-md shadow-emerald-500/20"
                    >
                      {downloadingPaper === paper.id ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          {paper.cost === 0 ? 'Save Offline (Free)' : 'Save Offline'}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyClick(paper.id)}
                      className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/30"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Unlock All – KES 100
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Papers Yet</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            No papers are available for your university yet. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
