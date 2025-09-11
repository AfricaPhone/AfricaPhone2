// src/store/FilterContext.tsx
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Brand, FilterOptions, Segment } from '../types';

// AJOUT: Définition du type pour une fourchette de prix
export type PriceRange = {
  key: string;
  label: string;
  min?: number;
  max?: number;
};

// --- Types & État Initial ---
// AJOUT: Ajout de 'selectedPriceRangeKey' à l'état initial
const initialState: FilterOptions = {
  category: undefined,
  minPrice: '',
  maxPrice: '',
  brands: [],
  rom: undefined,
  ram: undefined,
  enPromotion: false,
  isVedette: false,
  selectedPriceRangeKey: undefined,
};

// --- Type du Contexte ---
type FilterContextType = {
  filters: FilterOptions;
  setCategory: (category: Segment | undefined) => void;
  setPriceRange: (min: string, max: string) => void;
  // AJOUT: Nouvelle fonction pour gérer la sélection d'une fourchette
  setPriceRangeByKey: (range: PriceRange | null) => void;
  toggleBrand: (brand: Brand) => void;
  setCapacity: (capacity: { rom?: number; ram?: number } | null) => void;
  setPromotion: (value: boolean) => void;
  setVedette: (value: boolean) => void;
  resetFilters: () => void;
  activeFilterCount: number;
};

const FilterContext = createContext<FilterContextType | null>(null);

// --- Provider ---
export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterOptions>(initialState);

  const setCategory = useCallback((category: Segment | undefined) => {
    setFilters(prev => ({ ...prev, category }));
  }, []);

  const setPriceRange = useCallback((min: string, max: string) => {
    // Si on tape manuellement, on désélectionne la fourchette
    setFilters(prev => ({ ...prev, minPrice: min, maxPrice: max, selectedPriceRangeKey: undefined }));
  }, []);

  // AJOUT: Nouvelle logique pour gérer les fourchettes de prix
  const setPriceRangeByKey = useCallback((range: PriceRange | null) => {
    if (range) {
      setFilters(prev => ({
        ...prev,
        minPrice: range.min?.toString() || '',
        maxPrice: range.max?.toString() || '',
        selectedPriceRangeKey: range.key,
      }));
    } else {
      // Permet de désélectionner une fourchette
      setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '', selectedPriceRangeKey: undefined }));
    }
  }, []);

  const toggleBrand = useCallback((brand: Brand) => {
    setFilters(prev => {
      const existing = prev.brands?.find(b => b.id === brand.id);
      const newBrands = existing
        ? prev.brands?.filter(b => b.id !== brand.id)
        : [...(prev.brands || []), brand];
      return { ...prev, brands: newBrands };
    });
  }, []);

  const setCapacity = useCallback((capacity: { rom?: number; ram?: number } | null) => {
    setFilters(prev => ({ ...prev, rom: capacity?.rom, ram: capacity?.ram }));
  }, []);

  const setPromotion = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, enPromotion: value }));
  }, []);

  const setVedette = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, isVedette: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialState);
  }, []);

    // Calcule le nombre de filtres actifs
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.category) count++;
        if (filters.minPrice || filters.maxPrice || filters.selectedPriceRangeKey) count++; // AJOUT: On compte la fourchette comme un filtre de prix
        if (filters.brands && filters.brands.length > 0) count += filters.brands.length;
        if (filters.rom || filters.ram) count++;
        if (filters.enPromotion) count++;
        if (filters.isVedette) count++;
        return count;
    }, [filters]);


  const value = useMemo(
    () => ({
      filters,
      setCategory,
      setPriceRange,
      setPriceRangeByKey, // AJOUT
      toggleBrand,
      setCapacity,
      setPromotion,
      setVedette,
      resetFilters,
      activeFilterCount
    }),
    [filters, setCategory, setPriceRange, toggleBrand, setCapacity, setPromotion, setVedette, resetFilters, activeFilterCount, setPriceRangeByKey]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

// --- Hook ---
export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider');
  return ctx;
};