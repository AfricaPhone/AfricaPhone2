// src/screens/home/CategoryScreen.tsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { usePaginatedProducts } from '../../hooks/usePaginatedProducts';
import ProductGrid from './ProductGrid';
import HomeListHeader from './HomeListHeader';
import { useProducts } from '../../store/ProductContext';
import { Product, PromoCard } from '../../types';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
} from '@react-native-firebase/firestore';
import { db } from '../../firebase/config';

const PAGE_SIZE = 10;

// --- Fonctions Utilitaires ---

const mapDocToProduct = (doc: QueryDocumentSnapshot): Product => {
  const data = doc.data();
  const imageUrls = data.imageUrls || [];
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: imageUrls.length > 0 ? imageUrls[0] : data.imageUrl || '',
    imageUrls: imageUrls,
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

const getUniqueProducts = (products: Product[]): Product[] => {
  return Array.from(new Map(products.map(p => [p.id, p])).values());
};

// --- Composant Principal ---

const CategoryScreen = ({ route }: any) => {
  const { category } = route.params;

  // --- États unifiés pour tous les cas ---
  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- États pour l'en-tête (uniquement pour "Populaires") ---
  const { brands, brandsLoading } = useProducts();
  const [promoCards, setPromoCards] = useState<PromoCard[]>([]);
  const [promoCardsLoading, setPromoCardsLoading] = useState(true);

  // --- Logique de construction de la requête Firestore ---
  const buildQuery = useCallback(
    (startAfterDoc: QueryDocumentSnapshot | null = null): Query<DocumentData> => {
      let q: Query<DocumentData> = collection(db, 'products');

      if (category === 'Populaires') {
        // Pour "Populaires", on trie par ordreVedette d'abord, puis par nom
        q = query(q, orderBy('ordreVedette', 'desc'), orderBy('name', 'asc'));
      } else {
        // Pour les autres catégories, on filtre et on trie par nom
        q = query(q, where('category', '==', category), orderBy('name', 'asc'));
      }

      q = query(q, limit(PAGE_SIZE));

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      return q;
    },
    [category]
  );

  // --- Logique de récupération des données ---
  const fetchData = useCallback(
    async (isRefresh: boolean = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const q = buildQuery();
        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(mapDocToProduct);

        setProducts(getUniqueProducts(fetchedProducts));
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setHasMore(fetchedProducts.length === PAGE_SIZE);
      } catch (error) {
        console.error(`Erreur de chargement pour la catégorie "${category}":`, error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery, category]
  );

  const loadMoreData = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);

    try {
      const q = buildQuery(lastDoc);
      const querySnapshot = await getDocs(q);
      const newProducts = querySnapshot.docs.map(mapDocToProduct);

      if (newProducts.length > 0) {
        setProducts(prevProducts => getUniqueProducts([...prevProducts, ...newProducts]));
      }

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(newProducts.length === PAGE_SIZE);
    } catch (error) {
      console.error(`Erreur de chargement de plus de produits pour "${category}":`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMore, buildQuery, category]);

  // --- Effet pour charger les données au changement de catégorie ou au montage ---
  useEffect(() => {
    fetchData();

    // Charger les cartes promo uniquement pour l'onglet "Populaires"
    if (category === 'Populaires') {
      const fetchPromoCards = async () => {
        try {
          setPromoCardsLoading(true);
          const promoCardsQuery = query(
            collection(db, 'promoCards'),
            where('isActive', '==', true),
            orderBy('sortOrder', 'asc')
          );
          const querySnapshot = await getDocs(promoCardsQuery);
          const fetchedCards = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as PromoCard[];
          setPromoCards(fetchedCards);
        } catch (error) {
          console.error('Erreur de chargement des cartes promo :', error);
        } finally {
          setPromoCardsLoading(false);
        }
      };
      fetchPromoCards();
    }
  }, [category]); // fetchData est stable grâce à useCallback

  // --- En-tête de la liste (mémoïsé) ---
  const memoizedListHeader = useMemo(() => {
    // N'afficher l'en-tête que pour l'onglet "Populaires"
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
