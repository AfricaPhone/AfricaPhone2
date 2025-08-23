// src/screens/home/HomeListHeader.tsx
import React from 'react';
import BrandCarousel from './BrandCarousel';
import PromoCardsCarousel from './PromoCardsCarousel';
import ProductSegments, { Segment } from './ProductSegments';
import { Brand, PromoCard } from '../../types';

interface Props {
  brands: Brand[];
  brandsLoading: boolean;
  promoCards: PromoCard[];
  promoCardsLoading: boolean;
  activeSegment: Segment;
  onSegmentChange: (segment: Segment) => void;
}

const HomeListHeader: React.FC<Props> = ({
  brands,
  brandsLoading,
  promoCards,
  promoCardsLoading,
  activeSegment,
  onSegmentChange,
}) => {
  return (
    <>
      <BrandCarousel brands={brands} isLoading={brandsLoading} />
      <PromoCardsCarousel promoCards={promoCards} isLoading={promoCardsLoading} />
      <ProductSegments activeSegment={activeSegment} onSegmentChange={onSegmentChange} />
    </>
  );
};

export default HomeListHeader;
