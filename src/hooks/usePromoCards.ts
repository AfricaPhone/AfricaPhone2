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
import { fetchActiveContestId, getContestById } from '../services/contestService';

const promoCardsCollection = collection(db, 'promoCards');
const DEFAULT_CONTEST_IMAGE = 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1400';

const sortByDefinedOrder = (a: PromoCard, b: PromoCard) => {
  const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
  return orderA - orderB;
};

const buildContestPromoCard = (
  contestId: string,
  contestData: any,
): PromoCard => {
  const contestImage =
    contestData?.heroImage || contestData?.bannerImage || contestData?.image || DEFAULT_CONTEST_IMAGE;

  return {
    id: `promo-contest-${contestId}`,
    title: contestData?.title ?? 'Concours',
    subtitle: contestData?.description ?? 'Elisez votre candidat favori.',
    cta: contestData?.status === 'ended' ? 'Voir les resultats' : 'Participer',
    image: contestImage,
    screen: 'Contest',
    screenParams: { contestId },
    sortOrder: -1,
  };
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
        let contestCard: PromoCard | null = null;

        try {
          const activeContestId = await fetchActiveContestId();
          if (activeContestId) {
            const contestData = await getContestById(activeContestId);
            if (contestData) {
              contestCard = buildContestPromoCard(activeContestId, contestData);
            }
          }
        } catch (contestError) {
          console.error('usePromoCards: active contest fetch failed', contestError);
        }

        let promoQuery: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> = promoCardsCollection;
        promoQuery = query(promoQuery, where('isActive', '==', true));

        const querySnapshot = await getDocs(promoQuery);
        const fetchedCards = querySnapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as PromoCard) }))
          .sort(sortByDefinedOrder);

        if (!isMounted) {
          return;
        }

        setPromoCards(contestCard ? [contestCard, ...fetchedCards] : fetchedCards);
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
