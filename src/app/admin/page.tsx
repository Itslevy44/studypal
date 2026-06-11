'use client';

import React, { useState } from 'react';

export default function AdminUploadPage() {
  // Form input states
  const [university, setUniversity] = useState('');
  const [campus, setCampus] = useState('');
  const [year, setYear] = useState('Year 1');
  const [cost, setCost] = useState('');
  const [duration, setDuration] = useState('30 Days');
  const [file, setFile] = useState<File | null>(null);

  // Status feedback states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

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

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ text: 'Admin authentication token is missing. Please log in again.', isError: true });
      setLoading(false);
      return;
    }

    // Prepare multi-part form data payload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('university', university);
    formData.append('campus', campus);
    formData.append('year', year);
    formData.append('cost', cost || '0');
    formData.append('duration', duration);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong during upload.');
      }

      // Reset form fields on complete success
      setMessage({ text: 'Success! Past paper securely archived to Telegram.', isError: false });
      setUniversity('');
      setCampus('');
      setCost('');
      setFile(null);
      // Reset file input element manually
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to connect to upload server.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-8">
        
        <h1 className="text-3xl font-bold text-center mb-2 text-indigo-400">Study Pal</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">Admin Portal — Upload Revision Materials</p>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
            message.isError ? 'bg-red-900/50 border border-red-500 text-red-200' : 'bg-green-900/50 border border-green-500 text-green-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Institution Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">University Name *</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. Egerton University"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 text-sm transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Campus *</label>
              <input
                type="text"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                placeholder="e.g. Main Campus"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 text-sm transition"
                required
              />
            </div>
          </div>

          {/* Academic Year Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Year of Study *</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white text-sm transition"
            >
              <option value="Year 1">Year 1</option>
              <option value="Year 2">Year 2</option>
              <option value="Year 3">Year 3</option>
              <option value="Year 4">Year 4</option>
              <option value="Year 5">Year 5</option>
            </select>
          </div>

          {/* Monetization Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Cost (KES) <span className="text-gray-500">(0 for free)</span></label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 50"
                min="0"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Access Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white text-sm transition"
              >
                <option value="24 Hours">24 Hours</option>
                <option value="7 Days">7 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="1 Semester">1 Semester</option>
                <option value="Lifetime">Lifetime</option>
              </select>
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Upload Material (PDF / Document) *</label>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer bg-gray-900 rounded-lg border border-gray-700 p-2"
              required
            />
          </div>

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-lg font-semibold text-sm transition tracking-wide text-white mt-4 ${
              loading 
                ? 'bg-indigo-800 opacity-60 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
            }`}
          >
            {loading ? 'Uploading & Structuring to Telegram...' : 'Publish Material'}
          </button>
        </form>

      </div>
    </div>
  );
}