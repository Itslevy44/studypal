'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  contactInfo: string;
  telegramFileId?: string;
  telegramMessageId?: string;
  createdAt: string;
  status: string;
}

interface Advertisement {
  id: string;
  title: string;
  description: string;
  linkUrl?: string;
  telegramFileId: string;
  createdAt: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  university: string;
  createdAt: string;
}

interface University {
  id: string;
  name: string;
}

const CATEGORIES = ['All', 'Calculators', 'Furniture', 'Electronics', 'Textbooks', 'Others'];

export default function MarketplacePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Data lists
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Carousel state
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // M-Pesa payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState<MarketplaceItem | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [buyingItem, setBuyingItem] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{ status: 'loading' | 'success' | 'error'; message: string } | null>(null);
  
  // Contact detail tooltip state
  const [showContactInfo, setShowContactInfo] = useState<string | null>(null);
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchData = async (userUnivId: string) => {
    try {
      const [itemsRes, adsRes, noticesRes, univsRes] = await Promise.all([
        fetch('/api/marketplace/items'),
        fetch('/api/marketplace/advertisements'),
        fetch(`/api/marketplace/notices?university=${userUnivId}`),
        fetch('/api/universities'),
      ]);

      const itemsData = await itemsRes.json();
      const adsData = await adsRes.json();
      const noticesData = await noticesRes.json();
      const univsData = await univsRes.json();

      setItems(itemsData.items || []);
      setAds(adsData.advertisements || []);
      setNotices(noticesData.notices || []);
      setUniversities(univsData.universities || []);
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setPhoneNumber(parsedUser.phone || '');

    fetchData(parsedUser.university || '');
  }, [router]);

  // Ads auto-sliding effect
  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [ads]);

  const getUniversityName = (id: string) =>
    universities.find((u) => u.id === id)?.name || id;

  const handlePurchase = (item: MarketplaceItem) => {
    setShowPaymentModal(item);
    setPaymentStatus(null);
    setMessage({ text: '', isError: false });
  };

  const submitMpesaPayment = async () => {
    if (!showPaymentModal || !phoneNumber) return;
    const item = showPaymentModal;
    
    setBuyingItem(item.id);
    setPaymentStatus({ status: 'loading', message: 'Initiating M-Pesa STK Push…' });
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify({
          phoneNumber,
          amount: item.price,
          accountReference: item.id, // sends full item_ ID
          transactionDesc: `Purchase: ${item.title}`,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment initiation failed');
      
      setPaymentStatus({ 
        status: 'success', 
        message: '✅ STK Push sent! Enter your M-Pesa PIN on your phone to complete order.' 
      });

      // Optimistically update the UI to sold out after a few seconds
      setTimeout(() => {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'sold' } : i));
        setShowPaymentModal(null);
        setMessage({ text: `Order payment initiated for "${item.title}". Item marked as pending/sold.`, isError: false });
      }, 3500);

    } catch (error: any) {
      setPaymentStatus({ status: 'error', message: error.message || 'Payment initiation failed' });
    } finally {
      setBuyingItem(null);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = 
      !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
          <span className="font-bold text-slate-900">Marketplace</span>
          <span className="text-sm text-slate-500">{user?.fullName}</span>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            
            {/* Advertisements Slider */}
            {ads.length > 0 && (
              <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-lg h-56 md:h-64 group">
                {ads.map((ad, idx) => (
                  <div
                    key={ad.id}
                    className={`absolute inset-0 transition-opacity duration-1000 flex flex-col justify-end p-8 md:p-12 ${
                      idx === currentAdIndex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    {/* Banner Image */}
                    {ad.telegramFileId && (
                      <img
                        src={`/api/media/telegram/${ad.telegramFileId}`}
                        alt={ad.title}
                        className="absolute inset-0 object-cover w-full h-full opacity-60"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
                    
                    <div className="relative z-10 max-w-lg space-y-2 text-white">
                      <span className="inline-block px-2.5 py-0.5 rounded bg-fuchsia-600 text-[10px] font-bold uppercase tracking-widest">Sponsored</span>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight">{ad.title}</h2>
                      <p className="text-sm text-slate-200 leading-relaxed line-clamp-2">{ad.description}</p>
                      {ad.linkUrl && (
                        <a
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 pt-1"
                        >
                          Learn More
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Dots indicator */}
                {ads.length > 1 && (
                  <div className="absolute bottom-4 right-6 z-20 flex gap-1.5">
                    {ads.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentAdIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentAdIndex ? 'w-4 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Bar */}
            {message.text && (
              <div className={`p-4 rounded-2xl border text-sm font-medium flex items-center gap-2 animate-fade-in ${
                message.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {message.text}
                <button onClick={() => setMessage({ text: '', isError: false })} className="ml-auto opacity-60 hover:opacity-100">✕</button>
              </div>
            )}

            {/* Split Screen Grid (Store vs notices) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Marketplace items - Left Column */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Filters */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search store (e.g. calculator, desk, mini-fridge...)"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 hover:border-slate-300 transition-all"
                    />
                  </div>
                  
                  {/* Category Pills */}
                  <div className="flex gap-2 flex-wrap pt-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                          selectedCategory === cat
                            ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-500/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Grid */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white rounded-3xl border border-slate-200 p-5 animate-pulse h-80 space-y-4">
                        <div className="h-40 bg-slate-200 rounded-2xl" />
                        <div className="h-5 w-2/3 bg-slate-200 rounded" />
                        <div className="h-4 w-1/2 bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-fuchsia-50 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No items listed</h3>
                    <p className="text-slate-500 text-sm">Check back later or try clearing your filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredItems.map((item) => {
                      const isSold = item.status === 'sold';
                      return (
                        <div key={item.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-fuchsia-200 transition-all flex flex-col group relative">
                          
                          {/* Image preview */}
                          <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100 flex-shrink-0">
                            {item.telegramFileId ? (
                              <img
                                src={`/api/media/telegram/${item.telegramFileId}`}
                                alt={item.title}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <span className="text-slate-400 text-xs">No image provided</span>
                            )}
                            
                            {/* Category and Condition Badges */}
                            <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                              <span className="bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                                {item.category}
                              </span>
                              <span className="bg-fuchsia-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                                {item.condition}
                              </span>
                            </div>

                            {/* Sold Overlay */}
                            {isSold && (
                              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="px-4 py-1.5 rounded-xl border border-red-500 bg-red-950/80 text-red-400 text-xs font-black uppercase tracking-widest">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            <div>
                              <h4 className="font-extrabold text-slate-950 text-sm group-hover:text-fuchsia-600 transition-colors line-clamp-1">
                                {item.title}
                              </h4>
                              <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            </div>

                            <div className="space-y-3 pt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-black text-slate-900">KES {item.price.toLocaleString()}</span>
                              </div>

                              {/* Action Row */}
                              <div className="flex gap-2 relative">
                                {!isSold ? (
                                  <>
                                    <button
                                      onClick={() => handlePurchase(item)}
                                      className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-fuchsia-500/10"
                                    >
                                      Pay M-Pesa
                                    </button>
                                    <button
                                      onClick={() => setShowContactInfo(showContactInfo === item.id ? null : item.id)}
                                      className="px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-all relative flex items-center justify-center"
                                      title="Seller Contacts"
                                    >
                                      📞
                                      {showContactInfo === item.id && (
                                        <div className="absolute bottom-full mb-2 right-0 w-48 bg-slate-900 border border-slate-800 text-white text-left p-3 rounded-2xl shadow-xl z-30 animate-slide-up text-[11px] font-semibold">
                                          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Seller Contacts</p>
                                          <p className="break-words select-all bg-slate-800 rounded px-1.5 py-1 text-center font-mono mt-1 text-cyan-400">{item.contactInfo}</p>
                                        </div>
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    disabled
                                    className="w-full bg-slate-100 text-slate-400 text-xs font-bold py-2.5 rounded-xl cursor-not-allowed border border-slate-200"
                                  >
                                    Item Sold Out
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notice Board - Right Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-6">
                  <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                    <span className="text-lg">📢</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Notice Board</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {user ? getUniversityName(user.university) : 'Announcements'}
                      </p>
                    </div>
                  </div>

                  {notices.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="text-2xl opacity-40">📭</span>
                      <p className="text-xs text-slate-400 font-medium mt-2">No active announcements for your university.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                      {notices.map((notice) => (
                        <div
                          key={notice.id}
                          className="border border-slate-100 hover:border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[8px] font-bold uppercase">
                              {notice.category}
                            </span>
                            <span className="text-[9px] text-slate-400 ml-auto font-medium">
                              {new Date(notice.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs leading-snug">{notice.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap">
                            {notice.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* M-Pesa Checkout Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Buy via M-Pesa</h3>
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{showPaymentModal.title}</p>
              </div>
              <button
                onClick={() => { setShowPaymentModal(null); setPaymentStatus(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-gradient-to-r from-fuchsia-50 to-violet-50 border border-fuchsia-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Price</p>
                <p className="text-3xl font-black text-fuchsia-700">KES {showPaymentModal.price.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-fuchsia-100 flex items-center justify-center text-2xl">🛍️</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">M-Pesa Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
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
              <button
                onClick={submitMpesaPayment}
                disabled={buyingItem === showPaymentModal.id || !phoneNumber || paymentStatus?.status === 'success'}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-bold text-sm py-3 transition-all shadow-lg shadow-fuchsia-500/25 disabled:opacity-50"
              >
                {buyingItem === showPaymentModal.id ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Sending…</> : `Pay KES ${showPaymentModal.price}`}
              </button>
              <button
                onClick={() => { setShowPaymentModal(null); setPaymentStatus(null); }}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">The STK push will be sent to your M-Pesa number.</p>
          </div>
        </div>
      )}
    </div>
  );
}
