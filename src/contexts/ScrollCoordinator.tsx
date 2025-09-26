import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ScrollCoordinatorContextType = {
  parentScrollEnabled: boolean;
  lockParentScroll: () => void;
  unlockParentScroll: () => void;
};

const ScrollCoordinatorContext = createContext<ScrollCoordinatorContextType | null>(null);

export const ScrollCoordinatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);
  const lockCountRef = useRef(0);

  const lockParentScroll = useCallback(() => {
    lockCountRef.current += 1;
    if (lockCountRef.current === 1) setParentScrollEnabled(false);
  }, []);

  const unlockParentScroll = useCallback(() => {
    lockCountRef.current = Math.max(0, lockCountRef.current - 1);
    if (lockCountRef.current === 0) setParentScrollEnabled(true);
  }, []);

  const value = useMemo(
    () => ({ parentScrollEnabled, lockParentScroll, unlockParentScroll }),
    [parentScrollEnabled, lockParentScroll, unlockParentScroll]
  );

  return <ScrollCoordinatorContext.Provider value={value}>{children}</ScrollCoordinatorContext.Provider>;
};

export const useScrollCoordinator = (): ScrollCoordinatorContextType => {
  const ctx = useContext(ScrollCoordinatorContext);
  if (!ctx) throw new Error('useScrollCoordinator must be used within a ScrollCoordinatorProvider');
  return ctx;
};
