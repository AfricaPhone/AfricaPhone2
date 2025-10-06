// src/screens/home/HomeListHeader.tsx
import React from 'react';
import BrandCarousel from './BrandCarousel';
import { Brand } from '../../types';

interface Props {
  brands: Brand[];
  brandsLoading: boolean;
}

const HomeListHeader: React.FC<Props> = ({ brands, brandsLoading }) => {
  return <BrandCarousel brands={brands} isLoading={brandsLoading} />;
};

export default HomeListHeader;
