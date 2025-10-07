import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { PromoCard } from '../types';
import { db } from '../firebase/config';

const promoCardsCollection = collection(db, 'promoCards');
const sortByDefinedOrder = (a: PromoCard, b: PromoCard) => {
  const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
  return orderA - orderB;
};

export const usePromoCards = (enabled: boolean = true) => {
  const [promoCards, setPromoCards] = useState<PromoCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setPromoCards([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadPromoCards = async () => {
      setLoading(true);

      try {
        let promoQuery: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> = promoCardsCollection;
        promoQuery = query(promoQuery, where('isActive', '==', true));

        const querySnapshot = await getDocs(promoQuery);
        const fetchedCards = querySnapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as PromoCard) }))
          .sort(sortByDefinedOrder);

        if (!isMounted) {
          return;
        }

        setPromoCards(fetchedCards);
      } catch (error) {
        console.error('usePromoCards: failed to load promo cards', error);
        if (isMounted) {
          setPromoCards([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPromoCards();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return { promoCards, loading };
};
