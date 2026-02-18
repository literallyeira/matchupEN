'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import type { Application } from '@/lib/supabase';
import { PROFILE_PROMPTS } from '@/lib/prompts';
import { getInlineBadges } from '@/lib/badges-client';
import { PhotoSlider } from '@/components/PhotoSlider';

interface Character {
  id: number;
  memberid: number;
  firstname: string;
  lastname: string;
}

function getGenderLabel(v: string) {
  return ({ erkek: 'Male', kadin: 'Female' }[v] || v);
}
function getPreferenceLabel(v: string) {
  return ({ heteroseksuel: 'Heterosexual', homoseksuel: 'Homosexual', biseksuel: 'Bisexual' }[v] || v);
}

export default function LikesPage() {
  const { data: session, status } = useSession();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [likedBy, setLikedBy] = useState<Application[]>([]);
  const [likedByCount, setLikedByCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>('free');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [photoIndices, setPhotoIndices] = useState<Record<string, number>>({});
  const [showReportModal, setShowReportModal] = useState<Application | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [blockReportPending, setBlockReportPending] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Kayıtlı karakteri localStorage'dan al
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    try {
      const raw = localStorage.getItem('matchup_selected_character');
      if (raw) {
        const saved = JSON.parse(raw) as Character;
        const chars = (session.user as any).characters || [];
        const found = (chars as Character[]).find((c: Character) => c.id === saved.id);
        if (found) setSelectedCharacter(found);
      }
    } catch {
      // ignore
    }
  }, [status, session?.user]);

  // Veri çek
  useEffect(() => {
    if (!selectedCharacter || status !== 'authenticated') {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [likedRes, limitsRes] = await Promise.all([
          fetch(`/api/liked-me?characterId=${selectedCharacter.id}`),
          fetch(`/api/me/limits?characterId=${selectedCharacter.id}`),
        ]);

        if (!cancelled && likedRes.ok) {
          const data = await likedRes.json();
          setLikedBy(data.likedBy || []);
          setLikedByCount(data.count ?? 0);
        }
        if (!cancelled && limitsRes.ok) {
          const limData = await limitsRes.json();
          setTier(limData.tier || 'free');
        }
      } catch {
        if (!cancelled) {
          setLikedBy([]);
          setLikedByCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [selectedCharacter, status]);

  const handleLike = async (profile: Application) => {
    if (!selectedCharacter) return;
    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toApplicationId: profile.id, characterId: selectedCharacter.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setLikedBy((prev) => prev.filter((p) => p.id !== profile.id));
        setLikedByCount((c) => Math.max(0, c - 1));
        if (data.isMatch) {
          showToast(`You matched with ${profile.first_name}!`, 'success');
        } else {
          showToast('Liked!', 'success');
        }
      } else if (res.status === 429) {
        showToast(data.error || 'Daily limit reached.', 'error');
      } else {
        showToast(data.error || 'An error occurred', 'error');
      }
    } catch {
      showToast('Bağlantı hatası', 'error');
    }
  };

  const handleDismiss = (profileId: string) => {
    setLikedBy((prev) => prev.filter((p) => p.id !== profileId));
    setLikedByCount((c) => Math.max(0, c - 1));
  };

  const handleBlock = async (profile: Application) => {
    if (!selectedCharacter) return;
    if (!confirm(`Are you sure you want to block ${profile.first_name} ${profile.last_name}?`)) return;
    setBlockReportPending(profile.id);
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedApplicationId: profile.id, characterId: selectedCharacter.id }),
      });
      if (res.ok) {
        setLikedBy((prev) => prev.filter((p) => p.id !== profile.id));
        setLikedByCount((c) => Math.max(0, c - 1));
        showToast('Profile blocked.', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to block.', 'error');
      }
    } catch {
      showToast('Connection error.', 'error');
    } finally {
      setBlockReportPending(null);
    }
  };

  const handleReport = async (profile: Application, reason?: string) => {
    if (!selectedCharacter) return;
    setBlockReportPending(profile.id);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportedApplicationId: profile.id, characterId: selectedCharacter.id, reason: reason || '' }),
      });
      if (res.ok) {
        setLikedBy((prev) => prev.filter((p) => p.id !== profile.id));
        setLikedByCount((c) => Math.max(0, c - 1));
        setShowReportModal(null);
        setReportReason('');
        showToast('Report received. Thank you.', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to send report.', 'error');
      }
    } catch {
      showToast('Connection error.', 'error');
    } finally {
      setBlockReportPending(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center py-20 px-4">
        <div className="animate-spin w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full" />
        <p className="mt-4 text-[var(--matchup-text-muted)]">Loading...</p>
      </main>
    );
  }

  if (status !== 'authenticated' || !session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center py-20 px-4">
        <div className="card max-w-md w-full text-center">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity mb-6">
            <Image src="/matchup_logo.png" alt="MatchUp" width={180} height={50} priority />
          </Link>
          <h1 className="text-xl font-bold mb-2">Liked Me</h1>
          <p className="text-[var(--matchup-text-muted)] mb-6">Please sign in to view this page.</p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <i className="fa-solid fa-right-to-bracket" /> Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (!selectedCharacter) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center py-20 px-4">
        <div className="card max-w-md w-full text-center">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity mb-6">
            <Image src="/matchup_logo.png" alt="MatchUp" width={180} height={50} priority />
          </Link>
          <h1 className="text-xl font-bold mb-2">No Character Selected</h1>
          <p className="text-[var(--matchup-text-muted)] mb-6">You must first select a character from the home page.</p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <i className="fa-solid fa-arrow-left" /> Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Image src="/matchup_logo.png" alt="MatchUp" width={140} height={40} priority />
          </Link>
          <Link href="/" className="btn-secondary text-sm">
            <i className="fa-solid fa-arrow-left mr-2" /> Home
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-eye text-violet-400" />
            Liked Me
          </h1>
          <p className="text-[var(--matchup-text-muted)] text-sm mt-1">These profiles liked you. Like them back to match!</p>
        </div>

        {/* Pro değilse ve beğenen varsa */}
        {tier !== 'pro' && likedByCount > 0 ? (
          <div className="card text-center py-12">
            <i className="fa-solid fa-heart text-5xl text-[var(--matchup-primary)] mb-4" />
            <h3 className="text-lg font-bold mb-1">{likedByCount} people liked you</h3>
            <p className="text-[var(--matchup-text-muted)] text-sm mb-4">Upgrade to MatchUp Pro to see who they are.</p>
            <Link href="/" className="btn-primary inline-flex items-center gap-2">
              <i className="fa-solid fa-crown" /> Go to Shop
            </Link>
          </div>
        ) : likedBy.length === 0 ? (
          <div className="card text-center py-12">
            <i className="fa-solid fa-heart-crack text-5xl text-[var(--matchup-text-muted)] mb-4" />
            <h3 className="text-lg font-bold mb-1">No one has liked you yet</h3>
            <p className="text-[var(--matchup-text-muted)] text-sm">Update your profile to reach more people!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {likedBy.map((profile) => {
              const profilePhotos = [profile.photo_url, ...(profile.extra_photos || [])].filter(Boolean);
              const hasMultiple = profilePhotos.length > 1;
              return (
              <div key={profile.id} className="rounded-3xl overflow-hidden shadow-2xl bg-[var(--matchup-bg-card)] animate-fade-in">
                {/* Photo */}
                {hasMultiple ? (
                  <PhotoSlider
                    photos={profilePhotos}
                    value={photoIndices[profile.id] ?? 0}
                    onChange={(i) => setPhotoIndices(prev => ({ ...prev, [profile.id]: i }))}
                    aspectClass="aspect-[3/2]"
                    emptyIcon={<i className="fa-solid fa-user text-4xl text-white/40" />}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                      {(() => {
                        const badges = getInlineBadges(profile);
                        return badges.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {badges.map(b => (
                              <span key={b.key} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${b.colorClass}`}>
                                <i className={`fa-solid ${b.icon}`} style={{ fontSize: '8px' }} /> {b.label}
                              </span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    <h3 className="text-xl font-bold text-white">{profile.first_name} {profile.last_name}</h3>
                    <p className="text-white/80 text-sm">{profile.age} · {getGenderLabel(profile.gender)}</p>
                    {profile.description && (
                      <p className="text-white/60 text-sm mt-1 line-clamp-2">{profile.description}</p>
                    )}
                  </div>
                  </PhotoSlider>
                ) : (
                <div className="relative w-full aspect-[3/2] overflow-hidden">
                  {profile.photo_url ? (
                    <Image src={profile.photo_url} alt="" fill className="object-cover object-top" sizes="(max-width: 640px) 100vw, 480px" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                      <i className="fa-solid fa-user text-4xl text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* Rozetler */}
                    {(() => {
                      const badges = getInlineBadges(profile);
                      return badges.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {badges.map(b => (
                            <span key={b.key} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${b.colorClass}`}>
                              <i className={`fa-solid ${b.icon}`} style={{ fontSize: '8px' }} /> {b.label}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <h3 className="text-xl font-bold text-white">{profile.first_name} {profile.last_name}</h3>
                    <p className="text-white/80 text-sm">{profile.age} · {getGenderLabel(profile.gender)}</p>
                    {profile.description && (
                      <p className="text-white/60 text-sm mt-1 line-clamp-2">{profile.description}</p>
                    )}
                  </div>
                </div>
                )}
                {/* Promptlar */}
                {profile.prompts && Object.keys(profile.prompts).filter(k => profile.prompts?.[k]?.trim()).length > 0 && (
                  <div className="mx-4 mt-3 mb-1 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 space-y-2.5">
                    {PROFILE_PROMPTS.filter(p => profile.prompts?.[p.key]?.trim()).map(p => (
                      <div key={p.key} className="pl-3 border-l-2 border-[var(--matchup-primary)]/60">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">{p.label}</p>
                        <p className="text-sm text-white/90 leading-relaxed mt-0.5">{profile.prompts![p.key]}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Actions */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLike(profile)}
                      className="btn-primary py-2.5 flex-1 flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-heart" /> Like & Match
                    </button>
                    <button
                      onClick={() => handleDismiss(profile.id)}
                      className="w-11 h-11 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all flex-shrink-0"
                    >
                      <i className="fa-solid fa-xmark text-lg" />
                    </button>
                  </div>
                  <div className="flex gap-2 text-xs text-[var(--matchup-text-muted)]">
                    <button
                      onClick={() => handleBlock(profile)}
                      disabled={!!blockReportPending}
                      className="flex-1 py-1.5 rounded-lg border border-white/20 hover:text-red-400 hover:border-red-500/30 transition-colors flex items-center justify-center gap-1"
                    >
                      <i className="fa-solid fa-ban" /> Block
                    </button>
                    <button
                      onClick={() => setShowReportModal(profile)}
                      disabled={!!blockReportPending}
                      className="flex-1 py-1.5 rounded-lg border border-white/20 hover:text-amber-400 transition-colors flex items-center justify-center gap-1"
                    >
                      <i className="fa-solid fa-flag" /> Report
                    </button>
                  </div>
                </div>
              </div>
            ); })}
          </div>
        )}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in" onClick={() => { setShowReportModal(null); setReportReason(''); }}>
          <div className="card max-w-sm w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Report</h2>
            <p className="text-[var(--matchup-text-muted)] text-sm mb-3">You are reporting {showReportModal.first_name} {showReportModal.last_name}'s profile.</p>
            <textarea
              className="form-input text-sm min-h-[80px] mb-4"
              placeholder="Reason (optional)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={500}
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowReportModal(null); setReportReason(''); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleReport(showReportModal, reportReason)} disabled={!!blockReportPending} className="btn-primary flex-1">
                {blockReportPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </main>
  );
}
