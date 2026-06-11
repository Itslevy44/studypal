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
  
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchCourse, setSearchCourse] = useState('');
  const [showPaymentPrompt, setShowPaymentPrompt] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [buyingPaper, setBuyingPaper] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{ status: 'loading' | 'success' | 'error'; message: string } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', isError: false });

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setSelectedUniversity(parsedUser.university);

    // Fetch universities
    fetchUniversities();
    // Fetch papers
    fetchPapers();
  }, [router]);

  const fetchUniversities = async () => {
    try {
      const response = await fetch('/api/universities');
      const data = await response.json();
      setUniversities(data.universities);
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    }
  };

  const fetchPapers = async (univFilter = '', yearFilter = '', courseFilter = '') => {
    try {
      const params = new URLSearchParams();
      if (univFilter) params.append('university', univFilter);
      if (yearFilter) params.append('year', yearFilter);
      if (courseFilter) params.append('course', courseFilter);

      const response = await fetch(`/api/papers?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Paper service error');
      }
      setPapers(data.papers || []);
      setMessage({ text: '', isError: false });
    } catch (error: any) {
      console.error('Failed to fetch papers:', error);
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

  const handlePurchase = (paperId: string) => {
    setShowPaymentPrompt(paperId);
    setPaymentStatus(null);
    setPhoneNumber('');
    setMessage({ text: '', isError: false });
  };

  const submitMpesaPayment = async (paper: Paper) => {
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
          amount: paper.cost,
          accountReference: paper.id.substring(0, 10),
          transactionDesc: `StudyPal: ${paper.course}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to initiate payment');
      }

      setPaymentStatus({ status: 'success', message: 'Check your phone and enter your M-Pesa PIN to complete payment.' });
      setShowPaymentPrompt(null);
      setMessage({ text: 'M-Pesa request sent. Please complete payment on your phone.', isError: false });
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus({ status: 'error', message: error?.message || 'Payment initiation failed.' });
    } finally {
      setBuyingPaper(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p>Loading papers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <Link href="/dashboard" className="text-2xl font-bold text-cyan-300 hover:text-cyan-200 transition">
              Study Pal
            </Link>
            <span className="rounded-full bg-slate-800 px-4 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
              Papers Library
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.fullName}</span>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/auth/login');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Message */}
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

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold">Browse Past Papers</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 text-slate-100 px-4 py-2 text-sm font-semibold hover:bg-slate-700 transition"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Filters */}
      <div className="glass-card rounded-[2rem] border-slate-800 p-6 mb-8 shadow-lg shadow-slate-950/30">
          <h2 className="text-lg font-semibold mb-4">Filter Papers</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">University</label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Universities</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Years</option>
                {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Search Course</label>
              <input
                type="text"
                value={searchCourse}
                onChange={(e) => setSearchCourse(e.target.value)}
                placeholder="e.g. MATH 101"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleFilter}
                className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-2xl font-semibold text-sm text-slate-950 transition"
              >
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Papers List */}
        {papers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <p className="text-gray-400 text-lg">No papers found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers.map((paper) => (
              <div key={paper.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-emerald-500 transition">
                <h3 className="text-lg font-bold mb-2">{paper.title}</h3>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold">Course:</span> {paper.course}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold">University:</span> {getUniversityName(paper.university)}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold">Period:</span> {paper.examPeriod}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold">Year:</span> {paper.yearOfStudy}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold">Size:</span> {paper.fileSize}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold">Downloads:</span> {paper.totalDownloads}
                  </p>
                </div>

                <p className="text-xs text-gray-500 mb-4">{paper.description}</p>

                <div className="flex flex-col gap-3">
                  <div>
                    {paper.cost === 0 ? (
                      <span className="text-lg font-bold text-green-400">FREE</span>
                    ) : (
                      <span className="text-lg font-bold text-emerald-400">KES {paper.cost}</span>
                    )}
                    <p className="text-xs text-gray-500">{paper.accessDuration}</p>
                  </div>

                  {showPaymentPrompt === paper.id ? (
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">M-Pesa Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="254700000000"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
                      />
                      {paymentStatus && (
                        <p className={`text-xs ${paymentStatus.status === 'error' ? 'text-red-400' : 'text-emerald-300'}`}>
                          {paymentStatus.message}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitMpesaPayment(paper)}
                          disabled={buyingPaper === paper.id}
                          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold text-sm transition disabled:opacity-60"
                        >
                          {buyingPaper === paper.id ? 'Sending…' : 'Pay via M-Pesa'}
                        </button>
                        <button
                          onClick={() => setShowPaymentPrompt(null)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-sm transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePurchase(paper.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold text-sm transition"
                    >
                      {paper.cost === 0 ? 'Access' : 'Buy'}
                    </button>
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
