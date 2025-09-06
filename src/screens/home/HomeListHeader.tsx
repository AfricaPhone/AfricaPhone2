// src/screens/home/HomeListHeader.tsx
import React from 'react';
import BrandCarousel from './BrandCarousel';
import PromoCardsCarousel from './PromoCardsCarousel';
import { Brand, PromoCard } from '../../types';

interface Props {
  brands: Brand[];
  brandsLoading: boolean;
  promoCards: PromoCard[];
  promoCardsLoading: boolean;
}

const HomeListHeader: React.FC<Props> = ({ brands, brandsLoading, promoCards, promoCardsLoading }) => {
  return (
    <>
      <BrandCarousel brands={brands} isLoading={brandsLoading} />
      <PromoCardsCarousel promoCards={promoCards} isLoading={promoCardsLoading} />
    </>
  );
};

export default HomeListHeader;
