import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ProductGrid from './ProductGrid';
import HomeListHeader from './HomeListHeader';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { useProducts } from '../../store/ProductContext';
import { Product, PromoCard } from '../../types';
import { db } from '../../firebase/config';
import { MOCK_CONTEST } from '../../data/mockContestData';

const PAGE_SIZE = 10;

type Snapshot = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

const productsCollection = collection(db, 'products');
const promoCardsCollection = collection(db, 'promoCards');

const mapDocToProduct = (doc: Snapshot): Product => {
  const data = doc.data();
  const imageUrls = data.imageUrls || [];
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: imageUrls.length > 0 ? imageUrls[0] : data.imageUrl || '',
    imageUrls,
    category: data.brand?.toLowerCase() || 'inconnu',
    description: data.description,
    rom: data.rom,
    ram: data.ram,
    ram_base: data.ram_base,
    ram_extension: data.ram_extension,
    ordreVedette: data.ordreVedette,
    isVedette: data.ordreVedette > 0,
    enPromotion: data.enPromotion,
  };
};

const getUniqueProducts = (products: Product[]): Product[] =>
  Array.from(new Map(products.map(p => [p.id, p])).values());

const CategoryScreen = ({ route }: { route: { params: { category: string } } }) => {
  const { category } = route.params;

  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<Snapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { brands, brandsLoading } = useProducts();
  const [promoCards, setPromoCards] = useState<PromoCard[]>([]);
  const [promoCardsLoading, setPromoCardsLoading] = useState(true);

  const buildQuery = useCallback(
    (startAfterDoc: Snapshot | null = null): FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> => {
      let queryRef: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> = productsCollection;

      if (category === 'Populaires') {
        queryRef = query(queryRef, orderBy('ordreVedette', 'desc'));
        queryRef = query(queryRef, orderBy('name', 'asc'));
      } else {
        queryRef = query(queryRef, where('category', '==', category));
        queryRef = query(queryRef, orderBy('name', 'asc'));
      }

      queryRef = query(queryRef, limit(PAGE_SIZE));

      if (startAfterDoc) {
        queryRef = query(queryRef, startAfter(startAfterDoc));
      }

      return queryRef;
    },
    [category]
  );

  const fetchData = useCallback(
    async (isRefresh: boolean = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const querySnapshot = await getDocs(buildQuery());
        const fetchedProducts = querySnapshot.docs.map(mapDocToProduct);

        setProducts(getUniqueProducts(fetchedProducts));
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? null);
        setHasMore(fetchedProducts.length === PAGE_SIZE);
      } catch (error) {
        console.error(`Erreur de chargement pour la categorie "${category}":`, error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery, category]
  );

  const loadMoreData = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) {
      return;
    }
    setLoadingMore(true);

    try {
      const querySnapshot = await getDocs(buildQuery(lastDoc));
      const newProducts = querySnapshot.docs.map(mapDocToProduct);

      if (newProducts.length > 0) {
        setProducts(prevProducts => getUniqueProducts([...prevProducts, ...newProducts]));
      }

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? null);
      setHasMore(newProducts.length === PAGE_SIZE);
    } catch (error) {
      console.error(`Erreur de chargement de plus de produits pour "${category}":`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMore, buildQuery, category]);

  useEffect(() => {
    fetchData();

    if (category === 'Populaires') {
      const fetchPromoCards = async () => {
        try {
          setPromoCardsLoading(true);

          const contestCard: PromoCard = {
            id: 'promo-contest-01',
            title: 'Concours de Vote',
            subtitle: "Elisez le journaliste tech de l'annee !",
            cta: 'Participer',
            image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1400',
            screen: 'Contest',
            screenParams: { contestId: MOCK_CONTEST.id },
            sortOrder: 0,
          };

          let promoQueryRef: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> = promoCardsCollection;
          promoQueryRef = query(promoQueryRef, where('isActive', '==', true));
          promoQueryRef = query(promoQueryRef, orderBy('sortOrder', 'asc'));

          const querySnapshot = await getDocs(promoQueryRef);
          const fetchedCards = querySnapshot.docs.map(
            (docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })
          ) as PromoCard[];

          setPromoCards([contestCard, ...fetchedCards]);
        } catch (error) {
          console.error('Erreur de chargement des cartes promo :', error);
        } finally {
          setPromoCardsLoading(false);
        }
      };
      fetchPromoCards();
    }
  }, [category, fetchData]);

  const memoizedListHeader = useMemo(() => {
    if (category !== 'Populaires') {
      return null;
    }
    return (
      <HomeListHeader
        brands={brands}
        brandsLoading={brandsLoading}
        promoCards={promoCards}
        promoCardsLoading={promoCardsLoading}
      />
    );
  }, [brands, brandsLoading, promoCards, promoCardsLoading, category]);

  return (
    <ProductGrid
      products={products}
      loading={loading}
      loadingMore={loadingMore}
      onLoadMore={loadMoreData}
      onRefresh={() => fetchData(true)}
      refreshing={refreshing}
      listHeaderComponent={memoizedListHeader}
      hasMore={hasMore}
    />
  );
};

export default CategoryScreen;
