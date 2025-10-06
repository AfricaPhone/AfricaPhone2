import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '../firebase/config';

type FeatureFlags = {
  promoCardsEnabled?: boolean;
};

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<FeatureFlags>({});

  useEffect(() => {
    const ref = doc(db, 'config', 'features');
    const unsubscribe = onSnapshot(
      ref,
      snapshot => {
        const data = snapshot.exists() ? (snapshot.data() as FeatureFlags) : {};
        setFlags(data || {});
      },
      () => {
        // On error, keep previous flags; default behavior is enabled
      }
    );
    return unsubscribe;
  }, []);

  const promoCardsEnabled = useMemo(() => {
    // default to true when not explicitly disabled
    return flags.promoCardsEnabled !== false;
  }, [flags.promoCardsEnabled]);

  return {
    promoCardsEnabled,
    flags,
  };
};

