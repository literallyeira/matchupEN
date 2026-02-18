'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const REF_STORAGE_KEY = 'matchup_ref';
const REF_EXPIRY_DAYS = 7;

export function RefTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || typeof ref !== 'string') return;

    // Ziyaret kaydı
    fetch('/api/track-ref', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }),
    }).catch(() => {});

    // Ref'i localStorage'da sakla (kayıt sırasında kullanılacak)
    try {
      const expiry = Date.now() + REF_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(REF_STORAGE_KEY, JSON.stringify({ code: ref, expiry }));
    } catch {
      // localStorage kapalı olabilir
    }
  }, [searchParams]);

  return null;
}

/** Kayıt sırasında gönderilecek ref kodu (varsa) */
export function getStoredRef(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const { code, expiry } = JSON.parse(raw);
    if (!code || expiry < Date.now()) return null;
    return code;
  } catch {
    return null;
  }
}

/** Ref kullanıldıktan sonra temizle (çift sayımı önle) */
export function clearStoredRef(): void {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    //
  }
}
