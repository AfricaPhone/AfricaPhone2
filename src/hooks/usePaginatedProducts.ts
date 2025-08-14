// src/hooks/usePaginatedProducts.ts
import { useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  FirebaseFirestoreTypes, // Importation principale des types
} from '@react-native-firebase/firestore';
import { db } from '../firebase/config';
import { Product } from '../types';

const PAGE_SIZE = 10;

// Options pour la requête
export interface ProductQueryOptions {
  category?: string;
  sortBy?: 'price' | 'rating' | 'name';
  sortDirection?: 'asc' | 'desc';
  searchQuery?: string;
}

// Convertit un document Firestore en type Product
const mapDocToProduct = (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot): Product => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.name,
    price: data.price,
    image: data.imageUrl,
    category: data.brand?.toLowerCase() || 'inconnu',
    rating: data.rating || 4.5,
    description: data.description,
    rom: data.rom,
    ram: data.ram,
    ram_base: data.ram_base,
    ram_extension: data.ram_extension,
  };
};

export const usePaginatedProducts = (options: ProductQueryOptions = {}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Garde une référence au dernier document pour la pagination
  const lastDocRef = useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);

  // Fonction pour construire la requête Firestore
  const buildQuery = (): FirebaseFirestoreTypes.Query => {
    let q: FirebaseFirestoreTypes.Query = collection(db, 'products');

    if (options.category && options.category !== 'Populaires') {
      // Correction pour utiliser le nom de la catégorie tel quel (ex: 'Tablettes')
      const categoryCapitalized = options.category.charAt(0).toUpperCase() + options.category.slice(1);
      q = query(q, where('category', '==', categoryCapitalized));
    }
    
    // Note: La recherche plein texte complexe nécessite des services comme Algolia ou Typesense.
    // Firestore ne supporte pas nativement la recherche de sous-chaînes.
    if (options.searchQuery) {
       q = query(q, where('name', '>=', options.searchQuery), where('name', '<=', options.searchQuery + '\uf8ff'));
    }

    if (options.sortBy) {
      q = query(q, orderBy(options.sortBy, options.sortDirection || 'asc'));
    } else {
      q = query(q, orderBy('name', 'asc')); // Tri par défaut
    }

    return q;
  };

  const fetchProducts = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      lastDocRef.current = null; // Réinitialiser pour le premier chargement
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      let q = buildQuery();
      q = query(q, limit(PAGE_SIZE));

      if (!isInitial && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current));
      }

      const querySnapshot = await getDocs(q);
      const newProducts = querySnapshot.docs.map(mapDocToProduct);
      
      lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      setHasMore(newProducts.length === PAGE_SIZE);

      if (isInitial) {
        setProducts(newProducts);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }

    } catch (error) {
      console.error("Erreur de chargement des produits: ", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [options.category, options.sortBy, options.sortDirection, options.searchQuery]);

  const refresh = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  return { products, loading, loadingMore, hasMore, loadMore: () => fetchProducts(false), refresh };
};
