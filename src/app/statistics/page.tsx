'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Badge {
  key: string;
  label: string;
  icon: string;
  color: string;
}

interface Stats {
  likesReceived: number;
  likesSent: number;
  matches: number;
  dislikesSent: number;
  totalViews: number;
  weeklyViews: number;
  daysActive: number;
  matchRate: number;
  memberSince: string;
}

interface Character {
  id: number;
  memberid: number;
  firstname: string;
  lastname: string;
}

const BADGE_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  green: 'bg-green-500/15 text-green-400 border-green-500/30',
  pink: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  violet: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export default function StatisticsPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('matchup_selected_character');
      if (raw) setSelectedCharacter(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!selectedCharacter) return;
    setLoading(true);
    try {
      const [statsRes, myDataRes] = await Promise.all([
        fetch(`/api/me/stats?characterId=${selectedCharacter.id}`),
        fetch(`/api/my-matches?characterId=${selectedCharacter.id}`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (myDataRes.ok) {
        const myData = await myDataRes.json();
        if (myData.application?.id) {
          setApplicationId(myData.application.id);
          // Rozetleri getir
          const badgeRes = await fetch(`/api/badges?applicationId=${myData.application.id}`);
          if (badgeRes.ok) {
            const badgeData = await badgeRes.json();
            setBadges(badgeData.badges || []);
          }
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedCharacter]);

  useEffect(() => {
    if (selectedCharacter && status === 'authenticated') fetchStats();
  }, [selectedCharacter, status, fetchStats]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4">
        <p className="text-gray-400">You must sign in.</p>
        <Link href="/" className="text-pink-400 hover:text-pink-300 underline">Back to Home</Link>
      </div>
    );
  }

  if (!selectedCharacter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4">
        <p className="text-gray-400">You must first select a character.</p>
        <Link href="/" className="text-pink-400 hover:text-pink-300 underline">Back to Home</Link>
      </div>
    );
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm mb-4 inline-block">
            <i className="fa-solid fa-arrow-left mr-2"></i>Home
          </Link>
          <h1 className="text-3xl font-bold">
            <i className="fa-solid fa-chart-simple text-pink-500 mr-3"></i>
            My Statistics
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            {selectedCharacter.firstname} {selectedCharacter.lastname}
          </p>
        </div>

        {/* Rozetler */}
        {badges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">My Badges</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <div key={badge.key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${BADGE_COLORS[badge.color] || BADGE_COLORS.pink}`}>
                  <i className={`fa-solid ${badge.icon}`} />
                  {badge.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* Main statistics - grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard icon="fa-eye" label="Total Views" value={stats.totalViews} color="text-blue-400" />
              <StatCard icon="fa-eye" label="This Week" value={stats.weeklyViews} color="text-cyan-400" />
              <StatCard icon="fa-heart" label="Likes Received" value={stats.likesReceived} color="text-pink-400" />
              <StatCard icon="fa-paper-plane" label="Likes Sent" value={stats.likesSent} color="text-purple-400" />
              <StatCard icon="fa-heart-circle-check" label="Matches" value={stats.matches} color="text-green-400" />
              <StatCard icon="fa-percent" label="Match Rate" value={`${stats.matchRate}%`} color="text-yellow-400" />
            </div>

            {/* Ek bilgiler */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Member Since</span>
                <span className="text-white text-sm font-medium">{formatDate(stats.memberSince)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Active Days</span>
                <span className="text-white text-sm font-medium">{stats.daysActive} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Dislikes Sent</span>
                <span className="text-white text-sm font-medium">{stats.dislikesSent}</span>
              </div>
            </div>
          </>
        )}

        {!stats && !loading && (
          <div className="text-center py-12 text-gray-500">
            <i className="fa-solid fa-chart-simple text-4xl mb-3 block"></i>
            <p>No statistics data found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <i className={`fa-solid ${icon} ${color} text-lg mb-2`}></i>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </div>
  );
}
