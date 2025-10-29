'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const PROGRESS_UPDATE_INTERVAL = 180;
const INITIAL_PROGRESS = 12;
const MAX_PROGRESS_BEFORE_COMPLETE = 90;

const growTowards = (current: number) => {
  if (current >= MAX_PROGRESS_BEFORE_COMPLETE) {
    return current;
  }
  const randomizedStep = Math.random() * 12;
  return Math.min(current + randomizedStep, MAX_PROGRESS_BEFORE_COMPLETE);
};

const TopProgressBar: React.FC = () => {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!pathname) {
      return undefined;
    }

    setVisible(true);
    setProgress(INITIAL_PROGRESS);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setProgress(prev => growTowards(prev));
    }, PROGRESS_UPDATE_INTERVAL);

    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
    }

    completeTimeoutRef.current = setTimeout(() => {
      setProgress(100);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 220);
    }, 400);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 150ms ease' }}
    >
      <div
        className="h-[3px] w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900"
        style={{
          transform: `scaleX(${Math.max(progress, visible ? INITIAL_PROGRESS : 0) / 100})`,
          transformOrigin: '0% 50%',
          transition: 'transform 120ms ease-out',
        }}
      />
    </div>
  );
};

export default TopProgressBar;
