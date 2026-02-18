'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Ad {
  id: string;
  position: string;
  image_url: string;
  link_url: string;
  expires_at: string;
}

function AdSlot({ ad, side }: { ad: Ad | null; side: 'left' | 'right' }) {
  // Position banner in the center of the space between main content (~700px) and screen edge
  const positionStyle = {
    [side]: 'calc((100vw - 700px) / 4 - 130px)',
  };

  if (ad) {
    return (
      <div
        className="fixed top-0 z-40 hidden xl:flex items-center h-screen"
        style={positionStyle}
      >
        <a
          href={ad.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="relative w-[260px]">
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-black/50 transition-all duration-300 group-hover:border-pink-500/30 group-hover:shadow-pink-500/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.image_url}
                alt="Ad"
                className="w-full h-[500px] object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-[9px] text-gray-500 px-2 py-0.5 rounded-full border border-white/5">
              Ad
            </div>
          </div>
        </a>
      </div>
    );
  }

  // Empty space - placeholder
  return (
    <div
      className="fixed top-0 z-40 hidden xl:flex items-center h-screen"
      style={positionStyle}
    >
      <Link href="/ads" className="block group">
        <div className="relative w-[260px]">
          <div className="rounded-2xl border border-dashed border-white/10 h-[500px] flex flex-col items-center justify-center gap-3 transition-all duration-300 group-hover:border-pink-500/30 group-hover:bg-pink-500/5 cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-pink-500/10 transition-all">
              <i className="fa-solid fa-rectangle-ad text-xl text-gray-600 group-hover:text-pink-400 transition-colors"></i>
            </div>
            <div className="text-center px-4">
              <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors font-medium">Ad Space</p>
              <p className="text-[10px] text-gray-600 group-hover:text-pink-400 transition-colors mt-1">Click to place an ad</p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function AdBanners() {
  const [leftAd, setLeftAd] = useState<Ad | null>(null);
  const [rightAd, setRightAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // First check if ad system is enabled
    fetch('/api/ads/status')
      .then((res) => res.json())
      .then((data) => {
        if (!data.enabled) {
          setLoaded(true);
          return;
        }
        setEnabled(true);
        return fetch('/api/ads')
          .then((res) => res.json())
          .then((data) => {
            setLeftAd(data.left || null);
            setRightAd(data.right || null);
          });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !enabled) return null;

  return (
    <>
      <AdSlot ad={leftAd} side="left" />
      <AdSlot ad={rightAd} side="right" />
    </>
  );
}
