'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

interface OrderItem {
  id: string;
  product: string;
  amount: number;
  created_at: string;
  character_name?: string;
}

function getProductLabel(product: string): string {
  if (product === 'plus') return 'MatchUp+';
  if (product === 'pro') return 'MatchUp Pro';
  if (product === 'boost') return 'Boost';
  if (product === 'ad_left') return 'Ad (Left)';
  if (product === 'ad_right') return 'Ad (Right)';
  return product;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SiparislerimPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch('/api/me/orders')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setOrders([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center py-20 px-4">
        <div className="animate-spin w-10 h-10 border-4 border-[var(--matchup-primary)] border-t-transparent rounded-full" />
        <p className="mt-4 text-[var(--matchup-text-muted)]">Yükleniyor...</p>
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
          <h1 className="text-xl font-bold mb-2">My Orders</h1>
          <p className="text-[var(--matchup-text-muted)] mb-6">Please sign in to view your order history.</p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <i className="fa-solid fa-right-to-bracket" /> Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Image src="/matchup_logo.png" alt="MatchUp" width={140} height={40} priority />
          </Link>
          <Link href="/" className="btn-secondary text-sm">
            <i className="fa-solid fa-arrow-left mr-2" /> Home
          </Link>
        </div>

        <div className="card">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <i className="fa-solid fa-receipt text-[var(--matchup-primary)]" />
            My Orders
          </h1>
          <p className="text-[var(--matchup-text-muted)] text-sm mb-6">Your subscription and payment history.</p>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-[var(--matchup-text-muted)]">
              <i className="fa-solid fa-receipt text-5xl mb-4 opacity-50" />
              <p>No orders yet.</p>
              <p className="text-sm mt-1">Your subscriptions and payments will be listed here.</p>
              <Link href="/" className="btn-secondary mt-6 inline-block">Back to Home</Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="p-4 rounded-xl bg-[var(--matchup-bg-input)] border border-[var(--matchup-border)]"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium">{getProductLabel(order.product)}</span>
                    <span className="text-[var(--matchup-primary)] font-semibold whitespace-nowrap">${order.amount}</span>
                  </div>
                  {order.character_name && order.character_name !== '-' && (
                    <p className="text-xs text-[var(--matchup-text-muted)] mt-1">{order.character_name}</p>
                  )}
                  <p className="text-xs text-[var(--matchup-text-muted)] mt-1">{formatDate(order.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
