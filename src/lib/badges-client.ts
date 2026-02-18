import type { Application } from './supabase';

export interface BadgeInfo {
  key: string;
  label: string;
  icon: string;
  colorClass: string;
}

const BADGE_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-400',
  green: 'bg-green-500/20 text-green-400',
  pink: 'bg-pink-500/20 text-pink-400',
  violet: 'bg-violet-500/20 text-violet-400',
  amber: 'bg-amber-500/20 text-amber-400',
};

/** Client-side rozet hesaplama - Application verisinden türetilebilen rozetler */
export function getInlineBadges(app: Application): BadgeInfo[] {
  const badges: BadgeInfo[] = [];

  if (app.is_verified) {
    badges.push({ key: 'verified', label: 'Doğrulanmış', icon: 'fa-circle-check', colorClass: BADGE_COLORS.blue });
  }

  if (app.phone?.trim()) {
    badges.push({ key: 'phone_verified', label: 'Onaylı', icon: 'fa-phone', colorClass: BADGE_COLORS.green });
  }

  const daysSince = (Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 7) {
    badges.push({ key: 'new_member', label: 'Yeni', icon: 'fa-seedling', colorClass: BADGE_COLORS.green });
  }
  if (daysSince >= 30) {
    badges.push({ key: 'veteran', label: 'Kıdemli', icon: 'fa-medal', colorClass: BADGE_COLORS.amber });
  }

  const lookingFor = app.looking_for;
  if (lookingFor === 'friends') {
    badges.push({ key: 'looking_friends', label: 'Arkadaş arıyor', icon: 'fa-user-group', colorClass: BADGE_COLORS.blue });
  } else if (lookingFor === 'dating') {
    badges.push({ key: 'looking_dating', label: 'Flört arıyor', icon: 'fa-heart', colorClass: BADGE_COLORS.pink });
  }

  const likedCount = (app as { liked_count?: number }).liked_count ?? 0;
  const matchCount = (app as { match_count?: number }).match_count ?? 0;
  if (likedCount >= 15 || matchCount >= 10) {
    badges.push({ key: 'popular', label: 'Çok beğenilen', icon: 'fa-fire', colorClass: 'bg-orange-500/20 text-orange-400' });
  } else if (likedCount >= 5 || matchCount >= 3) {
    badges.push({ key: 'popular', label: 'Popüler', icon: 'fa-star', colorClass: BADGE_COLORS.amber });
  }

  return badges;
}
