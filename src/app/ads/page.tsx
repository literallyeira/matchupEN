'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AdsPage() {
  const { data: session, status } = useSession();
  const [position, setPosition] = useState<'left' | 'right'>('left');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [activeAds, setActiveAds] = useState<{ left: AdInfo | null; right: AdInfo | null }>({ left: null, right: null });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  interface AdInfo {
    id: string;
    position: string;
    image_url: string;
    link_url: string;
    expires_at: string;
  }

  useEffect(() => {
    fetch('/api/ads')
      .then(res => res.json())
      .then(data => setActiveAds(data))
      .catch(() => {});
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePurchase = async () => {
    if (!imageUrl.trim()) return showToast('Image URL is required', 'error');
    if (!linkUrl.trim()) return showToast('Link URL is required', 'error');

    // URL format check
    try {
      new URL(imageUrl);
      new URL(linkUrl);
    } catch {
      return showToast('Enter a valid URL format (https://...)', 'error');
    }

    // Alanın dolu olup olmadığını kontrol et
    const currentAd = position === 'left' ? activeAds.left : activeAds.right;
    if (currentAd) {
      const expiresAt = new Date(currentAd.expires_at);
      if (expiresAt > new Date()) {
        return showToast(`This slot is occupied until ${expiresAt.toLocaleDateString('en-US')}.`, 'error');
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: position === 'left' ? 'ad_left' : 'ad_right',
          adImageUrl: imageUrl.trim(),
          adLinkUrl: linkUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'An error occurred', 'error');
        setLoading(false);
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      showToast('Server error', 'error');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4">
        <p className="text-gray-400">You must sign in to place an ad.</p>
        <Link href="/" className="text-pink-400 hover:text-pink-300 underline">Back to Home</Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm mb-4 inline-block">
            <i className="fa-solid fa-arrow-left mr-2"></i>Home
          </Link>
          <h1 className="text-3xl font-bold">
            <i className="fa-solid fa-rectangle-ad text-pink-500 mr-3"></i>
            Ad Space
          </h1>
          <p className="text-gray-400 mt-2">
            Place your ad banner on the left or right side of the MatchUp home page. 
            Weekly <span className="text-green-400 font-semibold">$25,000</span> (in-game).
          </p>
        </div>

        {/* Current active ads */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`p-4 rounded-xl border ${activeAds.left ? 'border-pink-500/30 bg-pink-500/5' : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              <i className={`fa-solid fa-arrow-left text-xs ${activeAds.left ? 'text-pink-400' : 'text-gray-600'}`}></i>
              <span className="text-sm font-medium">Left Slot</span>
            </div>
            {activeAds.left ? (
              <div className="text-xs text-gray-400">
                <span className="text-pink-400">Occupied</span> &middot; Until {formatDate(activeAds.left.expires_at)}
              </div>
            ) : (
              <div className="text-xs text-green-400">Available - Can be purchased</div>
            )}
          </div>
          <div className={`p-4 rounded-xl border ${activeAds.right ? 'border-pink-500/30 bg-pink-500/5' : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              <i className={`fa-solid fa-arrow-right text-xs ${activeAds.right ? 'text-pink-400' : 'text-gray-600'}`}></i>
              <span className="text-sm font-medium">Right Slot</span>
            </div>
            {activeAds.right ? (
              <div className="text-xs text-gray-400">
                <span className="text-pink-400">Occupied</span> &middot; Until {formatDate(activeAds.right.expires_at)}
              </div>
            ) : (
              <div className="text-xs text-green-400">Available - Can be purchased</div>
            )}
          </div>
        </div>

        {/* Ad creation form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <i className="fa-solid fa-plus text-pink-500"></i>
            Create New Ad
          </h2>

          {/* Position selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Position</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPosition('left')}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  position === 'left'
                    ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <i className="fa-solid fa-arrow-left mr-2"></i>Left Side
              </button>
              <button
                onClick={() => setPosition('right')}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  position === 'right'
                    ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                Right Side<i className="fa-solid fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Ad Image (URL)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setPreviewError(false);
              }}
              placeholder="https://example.com/reklam-banner.png"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 text-sm"
            />
              <p className="text-[11px] text-gray-600 mt-1">Recommended size: 160x600px or 160x300px (PNG/JPG)</p>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Destination URL (when clicked)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://facebrowser-tr.gta.world/profilim"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 text-sm"
            />
          </div>

          {/* Preview */}
          {imageUrl && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Preview</label>
              <div className="flex justify-center">
                <div className="relative w-[160px]">
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-black/50 bg-black/20">
                    {!previewError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt="Ad preview"
                        className="w-full h-auto object-cover"
                        onError={() => setPreviewError(true)}
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-gray-600 text-xs">
                        <i className="fa-solid fa-image-slash mr-2"></i>
                        Image failed to load
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-[9px] text-gray-500 px-2 py-0.5 rounded-full border border-white/5">
                    Ad
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Price and purchase */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Weekly price</p>
                <p className="text-2xl font-bold text-green-400">$25,000</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Duration: 7 days</p>
                <p>Payment: In-game bank</p>
              </div>
            </div>
            <button
              onClick={handlePurchase}
              disabled={loading || !imageUrl || !linkUrl}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold text-sm hover:from-pink-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></span>
                  Processing...
                </span>
              ) : (
                <span>
                  <i className="fa-solid fa-credit-card mr-2"></i>
                  Buy - $25,000
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-500 space-y-1">
          <p><i className="fa-solid fa-circle-info text-blue-400 mr-1"></i> Ad remains active for 7 days.</p>
          <p><i className="fa-solid fa-circle-info text-blue-400 mr-1"></i> Only displayed in desktop view (xl and above).</p>
          <p><i className="fa-solid fa-circle-info text-blue-400 mr-1"></i> Inappropriate content may be removed by admin.</p>
        </div>
      </div>
    </div>
  );
}
