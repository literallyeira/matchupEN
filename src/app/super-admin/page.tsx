'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Log {
    id: string;
    action: string;
    admin_name: string;
    details: {
        match_id?: string;
        app1?: string;
        app2?: string;
        application_id?: string;
        name?: string;
        info?: string;
    };
    created_at: string;
}

export default function SuperAdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/logs', {
                headers: {
                    'Authorization': password
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLogs(data);
                setIsAuthenticated(true);
                localStorage.setItem('adminPassword', password);
            } else {
                setError('Wrong password!');
            }
        } catch {
            setError('Connection error!');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async (savedPassword?: string) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/logs', {
                headers: {
                    'Authorization': savedPassword || password
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            }
        } catch {
            console.error('Fetch error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const savedPassword = localStorage.getItem('adminPassword');
        if (savedPassword) {
            setPassword(savedPassword);
            setIsAuthenticated(true);
            fetchLogs(savedPassword);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'admin_login': return 'Admin Login';
            case 'create_match': return 'Match Created';
            case 'delete_match': return 'Match Deleted';
            case 'delete_application': return 'Application Deleted';
            default: return action;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'admin_login': return 'text-blue-400';
            case 'create_match': return 'text-green-400';
            case 'delete_match': return 'text-red-400';
            case 'delete_application': return 'text-orange-400';
            default: return 'text-gray-400';
        }
    };

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
                        <h1 className="text-2xl font-bold">Super Admin</h1>
                        <p className="text-[var(--matchup-text-muted)] mt-2">Enter your password to view logs</p>
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
                </div>
            </main>
        );
    }

    return (
        <main className="py-12 px-4">
            <div className="max-w-4xl mx-auto">
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
                        <h1 className="text-xl font-bold border-l border-white/20 pl-4 ml-2">Super Logs</h1>
                    </div>
                    <button
                        onClick={() => fetchLogs()}
                        className="btn-secondary text-sm"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                <div className="space-y-4">
                    {logs.length === 0 ? (
                        <div className="card text-center py-12">
                            <p className="text-[var(--matchup-text-muted)]">No log records yet.</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="card p-5 animate-fade-in">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-bold ${getActionColor(log.action)}`}>
                                                {getActionLabel(log.action)}
                                            </span>
                                            <span className="text-white/20">•</span>
                                            <span className="text-white font-medium">{log.admin_name}</span>
                                        </div>
                                        <div className="text-[var(--matchup-text-muted)] text-sm">
                                            {log.details.app1 && log.details.app2 && <>{log.details.app1} & {log.details.app2}</>}
                                            {log.details.name && <span> ({log.details.name})</span>}
                                            {log.details.info && <span>{log.details.info}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/40 text-xs">{formatDate(log.created_at)}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
