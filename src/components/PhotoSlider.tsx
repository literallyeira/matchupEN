'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

const SWIPE_THRESHOLD = 50;

interface PhotoSliderProps {
  photos: string[];
  value: number;
  onChange: (index: number) => void;
  children?: React.ReactNode;
  aspectClass?: string;
  emptyIcon?: React.ReactNode;
  priority?: boolean;
}

export function PhotoSlider({ photos, value, onChange, children, aspectClass = 'aspect-[4/5]', emptyIcon, priority = false }: PhotoSliderProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const goPrev = useCallback(() => {
    onChange(Math.max(0, value - 1));
  }, [value, onChange]);

  const goNext = useCallback(() => {
    onChange(Math.min(photos.length - 1, value + 1));
  }, [value, onChange, photos.length]);

  const handleStart = useCallback((clientX: number) => {
    if (photos.length <= 1) return;
    startX.current = clientX;
    isDragging.current = true;
    setDragOffset(0);
  }, [photos.length]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging.current || photos.length <= 1) return;
    const delta = clientX - startX.current;
    const maxDrag = 120;
    setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, delta)));
  }, [photos.length]);

  const handleEnd = useCallback((clientX: number) => {
    if (!isDragging.current || photos.length <= 1) {
      setDragOffset(0);
      isDragging.current = false;
      return;
    }
    const delta = clientX - startX.current;
    if (delta > SWIPE_THRESHOLD) goPrev();
    else if (delta < -SWIPE_THRESHOLD) goNext();
    setDragOffset(0);
    isDragging.current = false;
  }, [photos.length, goPrev, goNext]);

  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => handleEnd(e.changedTouches[0].clientX);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = (e: MouseEvent) => {
      handleEnd(e.clientX);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const safeIdx = photos.length > 0 ? Math.min(Math.max(0, value), photos.length - 1) : 0;

  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden select-none`} style={{ touchAction: 'pan-y' }}>
      {photos.length > 0 ? (
        <div
          className="w-full h-full flex transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${dragOffset}px)` }}
        >
          <Image
            src={photos[safeIdx]}
            alt=""
            fill
            className="flex-shrink-0 object-cover object-top pointer-events-none"
            sizes="(max-width: 640px) 100vw, 480px"
            priority={priority && safeIdx === 0}
            draggable={false}
          />
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[var(--matchup-primary)] to-purple-600 flex items-center justify-center">
          {emptyIcon ?? <i className="fa-solid fa-user text-4xl text-white/50" />}
        </div>
      )}
      {photos.length > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
          {photos.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === safeIdx ? 'bg-white w-6' : 'bg-white/40 w-4'}`} />
          ))}
        </div>
      )}
      {children}
      {photos.length > 1 && (
        <div
          className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        />
      )}
    </div>
  );
}
