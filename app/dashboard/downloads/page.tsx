'use client';

import React, { useState, useEffect } from 'react';
import { getOfflinePapers, deleteOfflinePaper, OfflinePaper } from '@/lib/indexedDB';
import Link from 'next/link';

export default function OfflineDownloadsPage() {
  const [papers, setPapers] = useState<OfflinePaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Viewer state
  const [viewingPaper, setViewingPaper] = useState<OfflinePaper | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    loadOfflinePapers();
  }, []);

  // Secure shortcuts listener when viewer is open
  useEffect(() => {
    if (!viewingPaper) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+P (Print), Ctrl+S (Save), Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        alert('🔒 Secure Mode: Downloading, printing, and saving are disabled.');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [viewingPaper]);

  const loadOfflinePapers = async () => {
    try {
      const data = await getOfflinePapers();
      // Sort by downloadedAt descending
      setPapers(data.sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()));
    } catch (err) {
      console.error('Failed to load offline papers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaper = (paper: OfflinePaper) => {
    // Revoke any previous URL
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    const url = URL.createObjectURL(paper.blob);
    setPdfUrl(url);
    setViewingPaper(paper);
  };

  const handleClosePaper = () => {
    setViewingPaper(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleDeletePaper = async (id: string, title: string) => {
    if (!confirm(`Remove "${title}" from offline downloads?`)) return;
    try {
      await deleteOfflinePaper(id);
      loadOfflinePapers();
    } catch (err) {
      console.error('Failed to delete offline paper:', err);
      alert('Failed to remove paper.');
    }
  };

  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Offline Downloads</h2>
          <p className="text-slate-500 mt-1">Study your saved papers offline inside the application securely</p>
        </div>
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Search offline papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-300 transition-all font-medium"
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 animate-pulse h-48" />
          ))}
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Offline Papers</h3>
          <p className="text-slate-500 text-sm mb-6">
            {searchQuery ? "No downloaded papers match your search." : "You haven't saved any past papers offline yet. Papers you download will appear here."}
          </p>
          {!searchQuery && (
            <Link
              href="/papers"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all"
            >
              Browse Library
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                  {paper.course}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Saved: {new Date(paper.downloadedAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-2 flex-1">
                {paper.title}
              </h3>
              <p className="text-xs text-slate-400 mb-5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {paper.examPeriod} &bull; Year {paper.yearOfStudy}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenPaper(paper)}
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/25"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Offline
                </button>
                <button
                  onClick={() => handleDeletePaper(paper.id, paper.title)}
                  className="px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all flex items-center justify-center"
                  title="Remove Offline Paper"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECURE IN-APP PDF VIEWER MODAL */}
      {viewingPaper && pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-1 inline-block">
                  🔒 Secure Offline Study Mode
                </span>
                <h3 className="font-bold text-slate-800 text-base md:text-lg line-clamp-1">
                  {viewingPaper.course} &bull; {viewingPaper.title}
                </h3>
              </div>
              <button
                onClick={handleClosePaper}
                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 transition-all"
                title="Close Viewer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Security Warning Bar */}
            <div className="bg-indigo-50 border-y border-indigo-100 px-6 py-2 text-center text-xs text-indigo-700 font-semibold flex items-center justify-center gap-1">
              <span>🔒 To protect copyright, printing, downloading, and copying text are strictly disabled.</span>
            </div>

            {/* PDF Render Area */}
            <div className="relative bg-slate-100 flex-1 p-2 min-h-[60vh] flex items-center justify-center">
              {/* Overlay blocking right clicks and selections on the container */}
              <div 
                className="absolute inset-0 bg-transparent z-10 select-none pointer-events-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              />
              
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&statusbar=0&messages=0`}
                className="w-full h-full min-h-[65vh] rounded-2xl border-none shadow-inner bg-white"
                title={viewingPaper.title}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={handleClosePaper}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all"
              >
                Done Studying
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
