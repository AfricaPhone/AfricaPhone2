import React, { useCallback, useState, useEffect } from 'react';
import ProductGrid from './ProductGrid';
import PromoCardsCarousel from './PromoCardsCarousel';
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
import { Product } from '../../types';
import { db } from '../../firebase/config';
import { usePromoCards } from '../../hooks/usePromoCards';

const PAGE_SIZE = 10;

type Snapshot = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

const productsCollection = collection(db, 'products');

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
  const { promoCards, loading: promoCardsLoading } = usePromoCards(category === 'Populaires');
  const listHeaderComponent =
    category === 'Populaires'
      ? <PromoCardsCarousel promoCards={promoCards} isLoading={promoCardsLoading} />
      : null;

  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<Snapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


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
  }, [fetchData, category]);

  return (
    <ProductGrid
      products={products}
      loading={loading}
      loadingMore={loadingMore}
      onLoadMore={loadMoreData}
      onRefresh={() => fetchData(true)}
      refreshing={refreshing}
      listHeaderComponent={listHeaderComponent}
      hasMore={hasMore}
    />
  );
};

export default CategoryScreen;
