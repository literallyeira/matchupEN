'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Application, Match } from '@/lib/supabase';

interface MatchWithApps extends Match {
    application_1: Application;
    application_2: Application;
}

export default function AdminPage() {
    const { data: session, status: sessionStatus } = useSession();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [applications, setApplications] = useState<Application[]>([]);
    const [matches, setMatches] = useState<MatchWithApps[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'applications' | 'matches' | 'subscriptions' | 'payments' | 'ads' | 'referrals'>('applications');
    const [subModal, setSubModal] = useState<{ appId: string; name: string; currentTier: string } | null>(null);
    const [subTier, setSubTier] = useState('free');
    const [subDays, setSubDays] = useState(7);
    const [subLoading, setSubLoading] = useState(false);
    const [appSubs, setAppSubs] = useState<Record<string, { tier: string; expiresAt: string | null }>>({});
    const [activeSubs, setActiveSubs] = useState<Array<{ application_id: string; tier: string; expires_at: string; first_name?: string; last_name?: string; character_name?: string }>>([]);
    const [paymentsList, setPaymentsList] = useState<Array<{ id: string; application_id: string; product: string; amount: number; created_at?: string; first_name?: string; last_name?: string; character_name?: string }>>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [paymentStats, setPaymentStats] = useState<{ total: number; lastWeek: number; fromSubscriptions: number; fromBoost: number; fromAds: number } | null>(null);
    const [loadingPaymentStats, setLoadingPaymentStats] = useState(false);
    const [adsList, setAdsList] = useState<Array<{ id: string; gtaw_user_id: number; position: string; image_url: string; link_url: string; expires_at: string; is_active: boolean; created_at: string }>>([]);
    const [loadingAds, setLoadingAds] = useState(false);
    const [linkStats, setLinkStats] = useState<{ total: number; today: number; last7Days: number } | null>(null);
    const [loadingLinkStats, setLoadingLinkStats] = useState(false);
    const [referralStats, setReferralStats] = useState<Array<{ code: string; gtawUserId: number; ownerName: string; count: number }>>([]);
    const [loadingReferralStats, setLoadingReferralStats] = useState(false);

    // Filters
    const [filterGender, setFilterGender] = useState('');
    const [filterPreference, setFilterPreference] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterActiveOnly, setFilterActiveOnly] = useState(false);
    const [sortByMatch, setSortByMatch] = useState<'none' | 'desc' | 'asc'>('none');

    // Test mode state
    const [testMode, setTestMode] = useState(false);

    // Ads toggle state
    const [adsEnabled, setAdsEnabled] = useState(false);

    // Load test mode from localStorage
    useEffect(() => {
        const savedTestMode = localStorage.getItem('matchup_test_mode');
        setTestMode(savedTestMode === 'true');
    }, []);

    const fetchAdsEnabled = async () => {
        try {
            const res = await fetch('/api/admin/ads-toggle', {
                headers: { Authorization: `Bearer ${password || localStorage.getItem('adminPassword') || ''}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAdsEnabled(data.enabled);
            }
        } catch { /* ignore */ }
    };

    const toggleAdsEnabled = async () => {
        const newVal = !adsEnabled;
        try {
            const res = await fetch('/api/admin/ads-toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${password || localStorage.getItem('adminPassword') || ''}`,
                },
                body: JSON.stringify({ enabled: newVal }),
            });
            if (res.ok) setAdsEnabled(newVal);
        } catch { /* ignore */ }
    };

    const toggleTestMode = () => {
        const newValue = !testMode;
        setTestMode(newValue);
        localStorage.setItem('matchup_test_mode', newValue.toString());
    };

    const getAdminName = () => {
        return (session?.user as any)?.username || (session?.user as any)?.name || localStorage.getItem('adminUcpName') || 'admin';
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const ucpName = (session?.user as any)?.username || (session?.user as any)?.name || 'bilinmiyor';
            const response = await fetch('/api/applications', {
                headers: {
                    'Authorization': password,
                    'X-Admin-Name': ucpName
                }
            });

            if (response.ok) {
                const data = await response.json();
                setApplications(data);
                setIsAuthenticated(true);
                localStorage.setItem('adminPassword', password);
                localStorage.setItem('adminUcpName', ucpName);
                fetchMatches(password);
                fetchAdsEnabled();
            } else {
                setError('Wrong password!');
            }
        } catch {
            setError('Connection error!');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchApplications = async (savedPassword?: string) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/applications', {
                headers: {
                    'Authorization': savedPassword || password,
                    'X-Admin-Name': getAdminName()
                }
            });

            if (response.ok) {
                const data = await response.json();
                setApplications(data);
            }
        } catch {
            console.error('Fetch error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMatches = async (savedPassword?: string) => {
        try {
            const response = await fetch('/api/matches', {
                headers: {
                    'Authorization': savedPassword || password,
                    'X-Admin-Name': getAdminName()
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMatches(data);
            }
        } catch {
            console.error('Fetch matches error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this application?')) return;

        try {
            const response = await fetch('/api/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': password || localStorage.getItem('adminPassword') || '',
                    'X-Admin-Name': getAdminName()
                },
                body: JSON.stringify({ id })
            });

            if (response.ok) {
                setApplications(applications.filter(app => app.id !== id));
            }
        } catch {
            console.error('Delete error');
        }
    };

    const handleDeleteMatch = async (id: string) => {
        if (!confirm('Are you sure you want to delete this match?')) return;

        try {
            const response = await fetch(`/api/matches?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': password || localStorage.getItem('adminPassword') || '',
                    'X-Admin-Name': getAdminName()
                }
            });

            if (response.ok) {
                setMatches(matches.filter(m => m.id !== id));
            }
        } catch {
            console.error('Delete match error');
        }
    };

    // Get matches for a specific application
    const getMatchesForApp = (appId: string): Application[] => {
        const matchedApps: Application[] = [];
        matches.forEach(m => {
            if (m.application_1_id === appId && m.application_2) {
                matchedApps.push(m.application_2);
            } else if (m.application_2_id === appId && m.application_1) {
                matchedApps.push(m.application_1);
            }
        });
        return matchedApps;
    };

    const fetchSubscription = async (appId: string) => {
        try {
            const res = await fetch(`/api/admin/subscription?applicationId=${appId}`, {
                headers: { Authorization: password || localStorage.getItem('adminPassword') || '' },
            });
            if (res.ok) {
                const data = await res.json();
                setAppSubs(prev => ({ ...prev, [appId]: { tier: data.tier, expiresAt: data.expiresAt } }));
            }
        } catch { /* ignore */ }
    };

    const fetchAllSubscriptions = async () => {
        const pwd = password || localStorage.getItem('adminPassword') || '';
        for (const app of applications) {
            try {
                const res = await fetch(`/api/admin/subscription?applicationId=${app.id}`, {
                    headers: { Authorization: pwd },
                });
                if (res.ok) {
                    const data = await res.json();
                    setAppSubs(prev => ({ ...prev, [app.id]: { tier: data.tier, expiresAt: data.expiresAt } }));
                }
            } catch { /* ignore */ }
        }
    };

    const fetchActiveSubscriptionsList = async () => {
        setLoadingSubs(true);
        try {
            const res = await fetch('/api/admin/subscriptions-list', {
                headers: { Authorization: password || localStorage.getItem('adminPassword') || '' },
            });
            if (res.ok) {
                const data = await res.json();
                setActiveSubs(Array.isArray(data) ? data : []);
            } else setActiveSubs([]);
        } catch { setActiveSubs([]); }
        finally { setLoadingSubs(false); }
    };

    const fetchPaymentsList = async () => {
        setLoadingPayments(true);
        try {
            const res = await fetch('/api/admin/payments-list', {
                headers: { Authorization: `Bearer ${password || localStorage.getItem('adminPassword') || ''}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPaymentsList(Array.isArray(data) ? data : []);
            } else setPaymentsList([]);
        } catch { setPaymentsList([]); }
        finally { setLoadingPayments(false); }
    };

    const fetchPaymentStats = async () => {
        setLoadingPaymentStats(true);
        try {
            const res = await fetch('/api/admin/payments-stats', {
                headers: { Authorization: `Bearer ${password || localStorage.getItem('adminPassword') || ''}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPaymentStats(data);
            } else setPaymentStats(null);
        } catch { setPaymentStats(null); }
        finally { setLoadingPaymentStats(false); }
    };

    const fetchAdsList = async () => {
        setLoadingAds(true);
        try {
            const res = await fetch('/api/admin/ads', {
                headers: { Authorization: `Bearer ${password || localStorage.getItem('adminPassword') || ''}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAdsList(Array.isArray(data) ? data : []);
            } else setAdsList([]);
        } catch { setAdsList([]); }
        finally { setLoadingAds(false); }
    };

    const fetchLinkStats = async () => {
        setLoadingLinkStats(true);
        try {
            const res = await fetch('/api/admin/link-stats', {
                headers: { Authorization: `Bearer ${password || localStorage.getItem('adminPassword') || ''}` },
            });
            if (res.ok) {
                const data = await res.json();
                setLinkStats(data.gtawfb || null);
            } else setLinkStats(null);
        } catch { setLinkStats(null); }
        finally { setLoadingLinkStats(false); }
    };

    const fetchReferralStats = async () => {
        setLoadingReferralStats(true);
        try {
            const res = await fetch('/api/admin/referral-stats', {
                headers: { Authorization: `Bearer ${password || localStorage.getItem('adminPassword') || ''}` },
            });
            if (res.ok) {
                const data = await res.json();
                setReferralStats(data.referrals || []);
            } else setReferralStats([]);
        } catch { setReferralStats([]); }
        finally { setLoadingReferralStats(false); }
    };

    const handleDeactivateAd = async (adId: string) => {
        if (!confirm('Are you sure you want to deactivate this ad?')) return;
        try {
            const res = await fetch('/api/admin/ads', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${password || localStorage.getItem('adminPassword') || ''}`,
                },
                body: JSON.stringify({ adId }),
            });
            if (res.ok) {
                setAdsList(adsList.map(a => a.id === adId ? { ...a, is_active: false } : a));
            }
        } catch { /* ignore */ }
    };

    const handleSubChange = async () => {
        if (!subModal) return;
        setSubLoading(true);
        try {
            const res = await fetch('/api/admin/subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: password || localStorage.getItem('adminPassword') || '',
                },
                body: JSON.stringify({ applicationId: subModal.appId, tier: subTier, durationDays: subDays }),
            });
            if (res.ok) {
                const data = await res.json();
                setAppSubs(prev => ({ ...prev, [subModal.appId]: { tier: data.tier, expiresAt: data.expiresAt || null } }));
                setSubModal(null);
            }
        } catch { /* ignore */ }
        setSubLoading(false);
    };

    // Uygulamalar yüklenince üyelikleri getir
    useEffect(() => {
        if (applications.length > 0 && isAuthenticated) fetchAllSubscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applications.length, isAuthenticated]);

    useEffect(() => {
        if (activeTab === 'subscriptions' && isAuthenticated) fetchActiveSubscriptionsList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isAuthenticated]);

    useEffect(() => {
        if (activeTab === 'payments' && isAuthenticated) {
            fetchPaymentsList();
            fetchPaymentStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isAuthenticated]);

    useEffect(() => {
        if (activeTab === 'ads' && isAuthenticated) fetchAdsList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isAuthenticated]);

    useEffect(() => {
        if (activeTab === 'referrals' && isAuthenticated) fetchReferralStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isAuthenticated]);

    const getSubLabel = (tier: string) => {
        if (tier === 'plus') return 'MatchUp+';
        if (tier === 'pro') return 'MatchUp Pro';
        return 'Free';
    };

    const getSubColor = (tier: string) => {
        if (tier === 'plus') return 'text-pink-400';
        if (tier === 'pro') return 'text-violet-400';
        return 'text-[var(--matchup-text-muted)]';
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPassword('');
        setApplications([]);
        setMatches([]);
        localStorage.removeItem('adminPassword');
        localStorage.removeItem('adminUcpName');
    };

    useEffect(() => {
        const savedPassword = localStorage.getItem('adminPassword');
        if (savedPassword) {
            setPassword(savedPassword);
            setIsAuthenticated(true);
            fetchApplications(savedPassword);
            fetchMatches(savedPassword);
            fetchAdsEnabled();
            fetchLinkStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const ACTIVE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 saat

    // Match count per application
    const matchCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        matches.forEach(m => {
            const id1 = m.application_1_id;
            const id2 = m.application_2_id;
            map[id1] = (map[id1] || 0) + 1;
            map[id2] = (map[id2] || 0) + 1;
        });
        return map;
    }, [matches]);

    // Filtered and sorted applications
    const filteredApplications = useMemo(() => {
        let list = applications.filter(app => {
            if (filterGender && app.gender !== filterGender) return false;
            if (filterPreference && app.sexual_preference !== filterPreference) return false;
            if (filterActiveOnly) {
                if (!app.last_active_at) return false;
                if (Date.now() - new Date(app.last_active_at).getTime() >= ACTIVE_THRESHOLD_MS) return false;
            }
            if (filterName.trim()) {
                const q = filterName.trim().toLowerCase();
                const full = `${app.first_name || ''} ${app.last_name || ''} ${app.character_name || ''}`.toLowerCase();
                if (!full.includes(q)) return false;
            }
            return true;
        });
        if (sortByMatch === 'desc') {
            list = [...list].sort((a, b) => (matchCountMap[b.id] || 0) - (matchCountMap[a.id] || 0));
        } else if (sortByMatch === 'asc') {
            list = [...list].sort((a, b) => (matchCountMap[a.id] || 0) - (matchCountMap[b.id] || 0));
        }
        return list;
    }, [applications, filterGender, filterPreference, filterActiveOnly, filterName, sortByMatch, matchCountMap]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatLastActive = (iso: string | null | undefined): string => {
        if (!iso) return '—';
        const d = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / (60 * 1000));
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        if (mins < 1) return 'Active now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return formatDate(iso);
    };

    const getGenderLabel = (value: string) => {
        const labels: Record<string, string> = {
            erkek: 'Male',
            kadin: 'Female'
        };
        return labels[value] || value;
    };

    const getSexualPreferenceLabel = (value: string) => {
        const labels: Record<string, string> = {
            heteroseksuel: 'Heterosexual',
            homoseksuel: 'Homosexual',
            biseksuel: 'Bisexual'
        };
        return labels[value] || value;
    };

    // Login Screen
    if (!isAuthenticated) {
        return (
            <main className="flex items-center justify-center px-4 py-20">
                <div className="card max-w-md w-full animate-fade-in">
                    <div className="text-center mb-8">
                        <Image
                            src="/matchup_logo.png"
                            alt="MatchUp Logo"
                            width={180}
                            height={50}
                            className="mx-auto mb-4"
                            priority
                        />
                        <h1 className="text-2xl font-bold">Admin Panel</h1>
                        {session?.user ? (
                            <p className="text-[var(--matchup-text-muted)] mt-2">Hello, <span className="text-white font-medium">{(session.user as any).username || session.user.name}</span></p>
                        ) : (
                            <p className="text-orange-400 mt-2">Please sign in with UCP first.</p>
                        )}
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm text-center">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="/" className="text-[var(--matchup-text-muted)] hover:text-[var(--matchup-primary)] text-sm">
                            ← Back to Home
                        </a>
                    </div>
                </div>
            </main>
        );
    }

    // Admin Dashboard
    return (
        <main className="py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
                            <Image
                                src="/matchup_logo.png"
                                alt="MatchUp Logo"
                                width={140}
                                height={40}
                                priority
                            />
                        </Link>
                        <div>
                            <span className="text-[var(--matchup-text-muted)]">Admin Panel</span>
                            {session?.user && (
                                <p className="text-xs text-[var(--matchup-primary)]">
                                    <i className="fa-solid fa-user-shield mr-1" />
                                    {(session.user as any).username || session.user.name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Ads Toggle */}
                        <button
                            onClick={toggleAdsEnabled}
                            className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${adsEnabled
                                ? 'bg-pink-500 text-white'
                                : 'bg-[var(--matchup-bg-card)] hover:bg-[var(--matchup-bg-input)]'
                                }`}
                        >
                            <i className="fa-solid fa-rectangle-ad"></i>
                            {adsEnabled ? 'Ads: On' : 'Ads: Off'}
                        </button>
                        {/* Test Mode Toggle */}
                        <button
                            onClick={toggleTestMode}
                            className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${testMode
                                ? 'bg-yellow-500 text-black'
                                : 'bg-[var(--matchup-bg-card)] hover:bg-[var(--matchup-bg-input)]'
                                }`}
                        >
                            <i className="fa-solid fa-flask"></i>
                            {testMode ? 'Test Mode: On' : 'Test Mode: Off'}
                        </button>
                        <button
                            onClick={() => { fetchApplications(); fetchMatches(); fetchLinkStats(); fetchReferralStats(); if (activeTab === 'payments') { fetchPaymentStats(); } }}
                            className="btn-secondary"
                        >
                            <i className="fa-solid fa-rotate-right mr-2"></i>Refresh
                        </button>
                        <button
                            onClick={handleLogout}
                            className="btn-secondary"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Ad link statistics */}
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 animate-fade-in">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-link text-orange-400" />
                                gtaw.link/matchupfb
                            </h3>
                            <p className="text-[var(--matchup-text-muted)] text-sm mt-0.5">Visitors from ad link</p>
                        </div>
                        {loadingLinkStats ? (
                            <div className="flex items-center gap-2 text-[var(--matchup-text-muted)]">
                                <i className="fa-solid fa-spinner fa-spin" /> Yükleniyor...
                            </div>
                        ) : linkStats ? (
                            <div className="flex gap-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white">{linkStats.total.toLocaleString('en-US')}</p>
                                    <p className="text-xs text-[var(--matchup-text-muted)]">Total</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-400">{linkStats.last7Days.toLocaleString('en-US')}</p>
                                    <p className="text-xs text-[var(--matchup-text-muted)]">Last 7 days</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-pink-400">{linkStats.today.toLocaleString('en-US')}</p>
                                    <p className="text-xs text-[var(--matchup-text-muted)]">Today</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[var(--matchup-text-muted)] text-sm">No data</p>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 animate-fade-in flex-wrap">
                    <button
                        onClick={() => setActiveTab('applications')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'applications'
                            ? 'bg-[var(--matchup-primary)] text-white'
                            : 'bg-[var(--matchup-bg-card)] hover:bg-[var(--matchup-bg-input)]'
                            }`}
                    >
                        <i className="fa-solid fa-users mr-2"></i>Profiles ({applications.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'matches'
                            ? 'bg-[var(--matchup-primary)] text-white'
                            : 'bg-[var(--matchup-bg-card)] hover:bg-[var(--matchup-bg-input)]'
                            }`}
                    >
                        <i className="fa-solid fa-heart mr-2"></i>Matches ({matches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('subscriptions')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'subscriptions'
                            ? 'bg-[var(--matchup-primary)] text-white'
                            : 'bg-[var(--matchup-bg-card)] hover:bg-[var(--matchup-bg-input)]'
                            }`}
                    >
                        <i className="fa-solid fa-crown mr-2"></i>Active Subscriptions
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'payments'
                            ? 'bg-[var(--matchup-primary)] text-white'
                            : 'bg-[var(--matchup-bg-card)] hover:bg-[var(--matchup-bg-input)]'
                            }`}
                    >
                        <i className="fa-solid fa-receipt mr-2"></i>Payments
                    </button>
                    <button
                        onClick={() => setActiveTab('ads')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'ads'
                            ? 'bg-[var(--matchup-primary)] text-white'
                            : 'bg-[var(--matchup-bg-card)] hover:bg-[var(--matchup-bg-input)]'
                            }`}
                    >
                        <i className="fa-solid fa-rectangle-ad mr-2"></i>Ads
                    </button>
                    <button
                        onClick={() => setActiveTab('referrals')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'referrals'
                            ? 'bg-[var(--matchup-primary)] text-white'
                            : 'bg-[var(--matchup-bg-card)] hover:bg-[var(--matchup-bg-input)]'
                            }`}
                    >
                        <i className="fa-solid fa-user-plus mr-2"></i>Referrals ({referralStats.length})
                    </button>
                </div>

                {activeTab === 'applications' && (
                    <>
                        {/* Stats */}
                        <div className="card mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">Total Applications</h2>
                                    <p className="text-[var(--matchup-text-muted)]">
                                        {filterGender || filterPreference
                                            ? `Filtered: ${filteredApplications.length} / ${applications.length}`
                                            : 'All applications in the system'}
                                    </p>
                                </div>
                                <div className="text-4xl font-bold text-[var(--matchup-primary)]">
                                    {filteredApplications.length}
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="card mb-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                            <h3 className="font-semibold mb-4"><i className="fa-solid fa-filter mr-2"></i>Filter</h3>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <div>
                                    <label className="form-label text-sm">Search by name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="First name, last name or character..."
                                        value={filterName}
                                        onChange={(e) => setFilterName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label text-sm">Gender</label>
                                    <select
                                        className="form-input"
                                        value={filterGender}
                                        onChange={(e) => setFilterGender(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        <option value="erkek">Male</option>
                                        <option value="kadin">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label text-sm">Orientation</label>
                                    <select
                                        className="form-input"
                                        value={filterPreference}
                                        onChange={(e) => setFilterPreference(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        <option value="heteroseksuel">Heterosexual</option>
                                        <option value="homoseksuel">Homosexual</option>
                                        <option value="biseksuel">Bisexual</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer h-10">
                                        <input
                                            type="checkbox"
                                            checked={filterActiveOnly}
                                            onChange={(e) => setFilterActiveOnly(e.target.checked)}
                                            className="w-4 h-4 rounded border-[var(--matchup-border)] bg-[var(--matchup-bg-input)]"
                                        />
                                        <span className="text-sm text-green-400"><i className="fa-solid fa-circle-dot mr-1"></i>Currently active</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="form-label text-sm">Sort by match count</label>
                                    <select
                                        className="form-input"
                                        value={sortByMatch}
                                        onChange={(e) => setSortByMatch(e.target.value as 'none' | 'desc' | 'asc')}
                                    >
                                        <option value="none">No sorting</option>
                                        <option value="desc">Most → Least</option>
                                        <option value="asc">Least → Most</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex items-end">
                                    <button
                                        onClick={() => { setFilterGender(''); setFilterPreference(''); setFilterName(''); setFilterActiveOnly(false); setSortByMatch('none'); }}
                                        className="btn-secondary w-full"
                                    >
                                        <i className="fa-solid fa-xmark mr-2"></i>Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Applications List */}
                        {isLoading ? (
                            <div className="text-center py-20">
                                <div className="animate-spin w-10 h-10 border-4 border-[var(--matchup-primary)] border-t-transparent rounded-full mx-auto"></div>
                                <p className="mt-4 text-[var(--matchup-text-muted)]">Loading...</p>
                            </div>
                        ) : filteredApplications.length === 0 ? (
                            <div className="card text-center py-16 animate-fade-in">
                                <p className="text-[var(--matchup-text-muted)] text-lg">
                                    {applications.length === 0 ? 'No applications yet' : 'No applications match the filters'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {filteredApplications.map((app, index) => {
                                    const appMatches = getMatchesForApp(app.id);

                                    return (
                                        <div
                                            key={app.id}
                                            className="card animate-fade-in transition-all"
                                            style={{ animationDelay: `${0.05 * index}s` }}
                                        >
                                            <div className="flex flex-col md:flex-row gap-6">
                                                {/* Photo */}
                                                <div
                                                    className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer bg-[var(--matchup-bg-input)]"
                                                    onClick={(e) => { e.stopPropagation(); app.photo_url && setSelectedImage(app.photo_url); }}
                                                >
                                                    {app.photo_url ? (
                                                        <img
                                                            src={app.photo_url}
                                                            alt={`${app.first_name} ${app.last_name}`}
                                                            className="w-full h-full object-cover hover:scale-110 transition-transform"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--matchup-text-muted)]">
                                                            No Photo
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div>
                                                            <h3 className="text-xl font-bold">
                                                                {app.first_name} {app.last_name}
                                                            </h3>
                                                            {app.character_name && (
                                                                <p className="text-[var(--matchup-primary)] text-sm">
                                                                    {app.character_name}
                                                                </p>
                                                            )}
                                                            <p className="text-[var(--matchup-text-muted)] text-sm">
                                                                Registered: {formatDate(app.created_at)}
                                                            </p>
                                                            <p className="text-[var(--matchup-text-muted)] text-sm">
                                                                Last active: <span className={app.last_active_at && (Date.now() - new Date(app.last_active_at).getTime()) < ACTIVE_THRESHOLD_MS ? 'text-green-400' : ''}>{formatLastActive(app.last_active_at)}</span>
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {/* Üyelik Badge */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const sub = appSubs[app.id];
                                                                    setSubTier(sub?.tier || 'free');
                                                                    setSubDays(7);
                                                                    setSubModal({ appId: app.id, name: `${app.first_name} ${app.last_name}`, currentTier: sub?.tier || 'free' });
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80 ${
                                                                    appSubs[app.id]?.tier === 'pro' ? 'border-violet-500/40 bg-violet-500/15 text-violet-400' :
                                                                    appSubs[app.id]?.tier === 'plus' ? 'border-pink-500/40 bg-pink-500/15 text-pink-400' :
                                                                    'border-[var(--matchup-border)] bg-[var(--matchup-bg-input)] text-[var(--matchup-text-muted)]'
                                                                }`}
                                                            >
                                                                <i className={`fa-solid ${appSubs[app.id]?.tier === 'pro' ? 'fa-crown' : appSubs[app.id]?.tier === 'plus' ? 'fa-star' : 'fa-user'} mr-1`} />
                                                                {getSubLabel(appSubs[app.id]?.tier || 'free')}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                                                                className="btn-danger"
                                                            >
                                                                <i className="fa-solid fa-trash mr-2"></i>Delete
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                                                        <div>
                                                            <span className="text-[var(--matchup-text-muted)] text-sm">Age</span>
                                                            <p className="font-semibold">{app.age}</p>
                                                        </div>

                                                        <div>
                                                            <span className="text-[var(--matchup-text-muted)] text-sm">Gender</span>
                                                            <p className="font-semibold">{getGenderLabel(app.gender)}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[var(--matchup-text-muted)] text-sm">Orientation</span>
                                                            <p className="font-semibold">{getSexualPreferenceLabel(app.sexual_preference)}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[var(--matchup-text-muted)] text-sm">Phone</span>
                                                            <p className="font-semibold">{app.phone || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[var(--matchup-text-muted)] text-sm">Facebrowser</span>
                                                            <p className="font-semibold">{app.facebrowser || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[var(--matchup-text-muted)] text-sm">Last active</span>
                                                            <p className={`font-semibold ${app.last_active_at && (Date.now() - new Date(app.last_active_at).getTime()) < ACTIVE_THRESHOLD_MS ? 'text-green-400' : ''}`}>{formatLastActive(app.last_active_at)}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[var(--matchup-text-muted)] text-sm">Looking for</span>
                                                            <p className="font-semibold">
                                                                {app.looking_for === 'friends' ? <span className="text-blue-400"><i className="fa-solid fa-user-group mr-1" />Looking for friends</span> :
                                                                 app.looking_for === 'dating' ? <span className="text-pink-400"><i className="fa-solid fa-heart mr-1" />Looking for dating</span> : '—'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-[var(--matchup-bg-input)] rounded-xl p-4">
                                                        <span className="text-[var(--matchup-text-muted)] text-sm block mb-2">Description</span>
                                                        <p className="text-sm leading-relaxed">{app.description}</p>
                                                    </div>

                                                    {/* Current Matches for this person */}
                                                    {appMatches.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-white/10">
                                                            <span className="text-[var(--matchup-text-muted)] text-sm block mb-2">
                                                                <i className="fa-solid fa-heart mr-1"></i>
                                                                Matches ({appMatches.length})
                                                            </span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {appMatches.map(match => (
                                                                    <span
                                                                        key={match.id}
                                                                        className="px-3 py-1 bg-[var(--matchup-primary)]/20 text-[var(--matchup-primary)] rounded-full text-sm"
                                                                    >
                                                                        {match.first_name} {match.last_name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'matches' && (
                    <div className="space-y-6">
                        {matches.length === 0 ? (
                            <div className="card text-center py-16 animate-fade-in">
                                <i className="fa-solid fa-heart-crack text-6xl text-[var(--matchup-text-muted)] mb-4"></i>
                                <p className="text-[var(--matchup-text-muted)] text-lg">
                                    No mutual like matches yet
                                </p>
                            </div>
                        ) : (
                            matches.map((match, index) => (
                                <div
                                    key={match.id}
                                    className="card animate-fade-in"
                                    style={{ animationDelay: `${0.05 * index}s` }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[var(--matchup-text-muted)] text-sm">
                                            {formatDate(match.created_at)}
                                        </span>
                                            <button
                                            onClick={() => handleDeleteMatch(match.id)}
                                            className="btn-danger text-sm"
                                        >
                                            <i className="fa-solid fa-trash mr-2"></i>Delete
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Person 1 */}
                                        <div className="flex-1 text-center">
                                            {match.application_1?.photo_url && (
                                                <div
                                                    className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-2 cursor-pointer"
                                                    onClick={() => setSelectedImage(match.application_1.photo_url)}
                                                >
                                                    <img
                                                        src={match.application_1.photo_url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <p className="font-semibold">
                                                {match.application_1?.first_name} {match.application_1?.last_name}
                                            </p>
                                            {match.application_1?.character_name && (
                                                <p className="text-[var(--matchup-primary)] text-sm">
                                                    {match.application_1.character_name}
                                                </p>
                                            )}
                                        </div>

                                        {/* Heart Icon */}
                                        <div className="text-4xl text-[var(--matchup-primary)]">
                                            <i className="fa-solid fa-heart"></i>
                                        </div>

                                        {/* Person 2 */}
                                        <div className="flex-1 text-center">
                                            {match.application_2?.photo_url && (
                                                <div
                                                    className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-2 cursor-pointer"
                                                    onClick={() => setSelectedImage(match.application_2.photo_url)}
                                                >
                                                    <img
                                                        src={match.application_2.photo_url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <p className="font-semibold">
                                                {match.application_2?.first_name} {match.application_2?.last_name}
                                            </p>
                                            {match.application_2?.character_name && (
                                                <p className="text-[var(--matchup-primary)] text-sm">
                                                    {match.application_2.character_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'subscriptions' && (
                    <div className="space-y-6">
                        <div className="card animate-fade-in">
                            <h2 className="text-lg font-semibold mb-4"><i className="fa-solid fa-crown mr-2 text-violet-400"></i>Active Subscriptions</h2>
                            <p className="text-[var(--matchup-text-muted)] text-sm mb-4">Non-expired subscriptions (Plus / Pro).</p>
                            {loadingSubs ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin w-10 h-10 border-4 border-[var(--matchup-primary)] border-t-transparent rounded-full" />
                                </div>
                            ) : activeSubs.length === 0 ? (
                                <p className="text-[var(--matchup-text-muted)] py-8 text-center">No active subscriptions.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--matchup-border)]">
                                                <th className="pb-3 pr-4 font-semibold">Profile</th>
                                                <th className="pb-3 pr-4 font-semibold">Character</th>
                                                <th className="pb-3 pr-4 font-semibold">Tier</th>
                                                <th className="pb-3 pr-4 font-semibold">Expires</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeSubs.map((s) => (
                                                <tr key={s.application_id} className="border-b border-[var(--matchup-border)]/50">
                                                    <td className="py-3 pr-4">{s.first_name} {s.last_name}</td>
                                                    <td className="py-3 pr-4 text-[var(--matchup-primary)]">{s.character_name || '-'}</td>
                                                    <td className="py-3 pr-4">
                                                        <span className={s.tier === 'pro' ? 'text-violet-400' : 'text-pink-400'}>
                                                            {getSubLabel(s.tier)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pr-4 text-[var(--matchup-text-muted)]">{formatDate(s.expires_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="space-y-6">
                        {/* Payment statistics */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 animate-fade-in">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <i className="fa-solid fa-chart-line text-emerald-400" />
                                        Payment Statistics
                                    </h3>
                                    <p className="text-[var(--matchup-text-muted)] text-sm mt-0.5">Total revenue by category</p>
                                </div>
                                {loadingPaymentStats ? (
                                    <div className="flex items-center gap-2 text-[var(--matchup-text-muted)]">
                                        <i className="fa-solid fa-spinner fa-spin" /> Yükleniyor...
                                    </div>
                                ) : paymentStats ? (
                                    <div className="flex gap-6 flex-wrap">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-white">${paymentStats.total.toLocaleString('en-US')}</p>
                                            <p className="text-xs text-[var(--matchup-text-muted)]">Total</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-emerald-400">${paymentStats.lastWeek.toLocaleString('en-US')}</p>
                                            <p className="text-xs text-[var(--matchup-text-muted)]">Last 7 days</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-violet-400">${paymentStats.fromSubscriptions.toLocaleString('en-US')}</p>
                                            <p className="text-xs text-[var(--matchup-text-muted)]">Subscriptions (Plus+Pro)</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-yellow-400">${paymentStats.fromBoost.toLocaleString('en-US')}</p>
                                            <p className="text-xs text-[var(--matchup-text-muted)]">Boost</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-pink-400">${paymentStats.fromAds.toLocaleString('en-US')}</p>
                                            <p className="text-xs text-[var(--matchup-text-muted)]">Ads</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[var(--matchup-text-muted)] text-sm">No data</p>
                                )}
                            </div>
                        </div>

                        <div className="card animate-fade-in">
                            <h2 className="text-lg font-semibold mb-4"><i className="fa-solid fa-receipt mr-2 text-[var(--matchup-primary)]"></i>Payments</h2>
                            <p className="text-[var(--matchup-text-muted)] text-sm mb-4">All completed payments (history).</p>
                            {loadingPayments ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin w-10 h-10 border-4 border-[var(--matchup-primary)] border-t-transparent rounded-full" />
                                </div>
                            ) : paymentsList.length === 0 ? (
                                <p className="text-[var(--matchup-text-muted)] py-8 text-center">No payment records yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--matchup-border)]">
                                                <th className="pb-3 pr-4 font-semibold">Date</th>
                                                <th className="pb-3 pr-4 font-semibold">Profile</th>
                                                <th className="pb-3 pr-4 font-semibold">Character</th>
                                                <th className="pb-3 pr-4 font-semibold">Product</th>
                                                <th className="pb-3 pr-4 font-semibold">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paymentsList.map((p) => (
                                                <tr key={p.id} className="border-b border-[var(--matchup-border)]/50">
                                                    <td className="py-3 pr-4 text-[var(--matchup-text-muted)]">{p.created_at ? formatDate(p.created_at) : '-'}</td>
                                                    <td className="py-3 pr-4">{p.first_name} {p.last_name}</td>
                                                    <td className="py-3 pr-4 text-[var(--matchup-primary)]">{p.character_name || '-'}</td>
                                                    <td className="py-3 pr-4">{p.product === 'pro' ? 'MatchUp Pro' : p.product === 'plus' ? 'MatchUp+' : p.product === 'boost' ? 'Boost' : p.product === 'ad_left' ? 'Ad (Left)' : p.product === 'ad_right' ? 'Ad (Right)' : p.product}</td>
                                                    <td className="py-3 pr-4 font-semibold text-[var(--matchup-primary)]">${p.amount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ads' && (
                    <div className="space-y-6">
                        <div className="card animate-fade-in">
                            <h2 className="text-lg font-semibold mb-4"><i className="fa-solid fa-rectangle-ad mr-2 text-pink-400"></i>Ads</h2>
                            <p className="text-[var(--matchup-text-muted)] text-sm mb-4">All ad records.</p>
                            {loadingAds ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin w-10 h-10 border-4 border-[var(--matchup-primary)] border-t-transparent rounded-full" />
                                </div>
                            ) : adsList.length === 0 ? (
                                <p className="text-[var(--matchup-text-muted)] py-8 text-center">No ads yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {adsList.map((ad) => {
                                        const isExpired = new Date(ad.expires_at) < new Date();
                                        const isActive = ad.is_active && !isExpired;
                                        return (
                                            <div key={ad.id} className={`p-4 rounded-xl border ${isActive ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/5 opacity-60'}`}>
                                                <div className="flex items-start gap-4">
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-white/10">
                                                        <img src={ad.image_url} alt="Ad" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                {isActive ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ad.position === 'left' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                                {ad.position === 'left' ? 'Left' : 'Right'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 truncate mb-1">
                                                            <i className="fa-solid fa-link mr-1"></i>
                                                            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400">{ad.link_url}</a>
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            GTAW ID: {ad.gtaw_user_id} &middot; Created: {formatDate(ad.created_at)} &middot; Expires: {formatDate(ad.expires_at)}
                                                        </p>
                                                    </div>
                                                    {isActive && (
                                                        <button
                                                            onClick={() => handleDeactivateAd(ad.id)}
                                                            className="btn-danger text-xs flex-shrink-0"
                                                        >
                                                            <i className="fa-solid fa-ban mr-1"></i>Deactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'referrals' && (
                    <div className="space-y-6">
                        <div className="card animate-fade-in">
                            <h2 className="text-lg font-semibold mb-4"><i className="fa-solid fa-user-plus mr-2 text-emerald-400"></i>Referral Codes</h2>
                            <p className="text-[var(--matchup-text-muted)] text-sm mb-4">Created referral codes, owners, and invite counts. Based on characters without an application. 20 invites = 1 month Pro.</p>
                            {loadingReferralStats ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin w-10 h-10 border-4 border-[var(--matchup-primary)] border-t-transparent rounded-full" />
                                </div>
                            ) : referralStats.length === 0 ? (
                                <p className="text-[var(--matchup-text-muted)] py-8 text-center">No referral codes created yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-left">
                                                <th className="pb-3 pr-4 font-semibold">Code</th>
                                                <th className="pb-3 pr-4 font-semibold">Owner</th>
                                                <th className="pb-3 pr-4 font-semibold">Invite Count</th>
                                                <th className="pb-3 font-semibold">Link</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {referralStats.map((r) => (
                                                <tr key={r.code} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="py-3 pr-4 font-mono text-emerald-400">{r.code}</td>
                                                    <td className="py-3 pr-4">{r.ownerName || '—'}</td>
                                                    <td className="py-3 pr-4">
                                                        <span className={r.count >= 20 ? 'text-emerald-400 font-bold' : ''}>{r.count}</span>
                                                        {r.count >= 20 && <span className="ml-1 text-xs text-emerald-400">(Got Pro)</span>}
                                                    </td>
                                                    <td className="py-3">
                                                        <a href={`https://matchup.icu?ref=${r.code}`} target="_blank" rel="noopener noreferrer" className="text-[var(--matchup-primary)] hover:underline text-xs truncate max-w-[180px] block">
                                                            matchup.icu?ref={r.code}
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Subscription Modal */}
            {subModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSubModal(null)}>
                    <div className="card max-w-sm w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-1">Change Subscription</h3>
                        <p className="text-[var(--matchup-text-muted)] text-sm mb-4">{subModal.name}</p>
                        <p className="text-xs text-[var(--matchup-text-muted)] mb-4">Current: <span className={getSubColor(subModal.currentTier)}>{getSubLabel(subModal.currentTier)}</span></p>

                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Tier</label>
                                <select className="form-input" value={subTier} onChange={(e) => setSubTier(e.target.value)}>
                                    <option value="free">Ücretsiz</option>
                                    <option value="plus">MatchUp+</option>
                                    <option value="pro">MatchUp Pro</option>
                                </select>
                            </div>
                            {subTier !== 'free' && (
                                <div>
                                    <label className="form-label">Duration (days)</label>
                                    <input type="number" className="form-input" min={1} max={365} value={subDays} onChange={(e) => setSubDays(Number(e.target.value))} />
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={handleSubChange} disabled={subLoading} className="btn-primary flex-1 py-2.5">
                                    {subLoading ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={() => setSubModal(null)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Full size"
                        className="max-w-full max-h-full rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        className="absolute top-6 right-6 text-white text-3xl hover:text-[var(--matchup-primary)]"
                        onClick={() => setSelectedImage(null)}
                    >
                        ×
                    </button>
                </div>
            )}
        </main>
    );
}
