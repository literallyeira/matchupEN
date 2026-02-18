import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface Badge {
  key: string;
  label: string;
  icon: string;
  color: string;
}

const ALL_BADGES: Record<string, Omit<Badge, 'key'>> = {
  verified: { label: 'Doğrulanmış', icon: 'fa-circle-check', color: 'blue' },
  phone_verified: { label: 'Onaylı', icon: 'fa-phone', color: 'green' },
  new_member: { label: 'Yeni Üye', icon: 'fa-seedling', color: 'green' },
  first_match: { label: 'İlk Eşleşme', icon: 'fa-heart', color: 'pink' },
  popular: { label: 'Popüler', icon: 'fa-fire', color: 'orange' },
  super_popular: { label: 'Süper Popüler', icon: 'fa-star', color: 'yellow' },
  pro_member: { label: 'Pro Üye', icon: 'fa-crown', color: 'violet' },
  plus_member: { label: 'Plus Üye', icon: 'fa-star', color: 'pink' },
  veteran: { label: 'Kıdemli', icon: 'fa-medal', color: 'amber' },
};

// GET - Belirli bir profil için rozetleri hesapla
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get('applicationId');

  if (!applicationId) {
    return NextResponse.json({ badges: [] });
  }

  try {
    const badges: Badge[] = [];

    // Uygulama bilgisi
    const { data: app } = await supabase
      .from('applications')
      .select('id, created_at, is_verified, phone')
      .eq('id', applicationId)
      .single();

    if (!app) return NextResponse.json({ badges: [] });

    // Doğrulanmış
    if (app.is_verified) {
      badges.push({ key: 'verified', ...ALL_BADGES.verified });
    }

    // Telefon onaylı
    if (app.phone?.trim()) {
      badges.push({ key: 'phone_verified', ...ALL_BADGES.phone_verified });
    }

    // Yeni üye (7 günden az)
    const daysSinceCreation = (Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7) {
      badges.push({ key: 'new_member', ...ALL_BADGES.new_member });
    }

    // Kıdemli (30 günden fazla)
    if (daysSinceCreation >= 30) {
      badges.push({ key: 'veteran', ...ALL_BADGES.veteran });
    }

    // Eşleşme sayısı
    const { count: matchCount } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .or(`application_1_id.eq.${applicationId},application_2_id.eq.${applicationId}`);

    if (matchCount && matchCount >= 1) {
      badges.push({ key: 'first_match', ...ALL_BADGES.first_match });
    }
    if (matchCount && matchCount >= 10) {
      badges.push({ key: 'popular', ...ALL_BADGES.popular });
    }
    if (matchCount && matchCount >= 25) {
      badges.push({ key: 'super_popular', ...ALL_BADGES.super_popular });
    }

    // Üyelik
    const now = new Date().toISOString();
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('application_id', applicationId)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub?.tier === 'pro') {
      badges.push({ key: 'pro_member', ...ALL_BADGES.pro_member });
    } else if (sub?.tier === 'plus') {
      badges.push({ key: 'plus_member', ...ALL_BADGES.plus_member });
    }

    return NextResponse.json({ badges });
  } catch (error) {
    console.error('Badges error:', error);
    return NextResponse.json({ badges: [] });
  }
}
