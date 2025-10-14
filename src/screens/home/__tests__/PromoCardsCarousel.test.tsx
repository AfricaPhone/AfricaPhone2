import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PromoCardsCarousel from '../PromoCardsCarousel';
import { PromoCard } from '../../../types';
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  __esModule: true,
  useNavigation: jest.fn(),
}));

jest.mock('../../../contexts/ScrollCoordinator', () => ({
  useScrollCoordinator: () => ({
    parentScrollEnabled: true,
    lockParentScroll: jest.fn(),
    unlockParentScroll: jest.fn(),
  }),
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const mockNavigate = jest.fn();

const createStoreCard = (overrides: Partial<PromoCard> = {}): PromoCard => ({
  id: 'store',
  title: 'Notre boutique',
  subtitle: 'Description',
  cta: 'Voir la boutique',
  image: 'https://example.com/image.jpg',
  screen: 'Store',
  ...overrides,
});

describe('PromoCardsCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  it('renders only the store promo card even if additional cards are provided', () => {
    const storeCard = createStoreCard({ title: 'Carte Boutique' });
    const otherCard: PromoCard = {
      id: 'other',
      title: 'Autre promo',
      subtitle: 'Autre description',
      cta: 'Découvrir',
      image: 'https://example.com/autre.jpg',
      screen: 'ProductDetail',
      screenParams: { productId: '123' },
    };

    const { getByText, queryByText } = render(
      <PromoCardsCarousel promoCards={[storeCard, otherCard]} isLoading={false} />
    );

    expect(getByText('Carte Boutique')).toBeTruthy();
    expect(queryByText('Autre promo')).toBeNull();
  });

  it('navigates to the store screen when the promo card is pressed', () => {
    const storeCard = createStoreCard();
    const { getByText } = render(<PromoCardsCarousel promoCards={[storeCard]} isLoading={false} />);

    fireEvent.press(getByText(storeCard.cta));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Store');
  });

  it('passes params when provided on the store card', () => {
    const params = { referrer: 'home' };
    const storeCard = createStoreCard({ screenParams: params });
    const { getByText } = render(<PromoCardsCarousel promoCards={[storeCard]} isLoading={false} />);

    fireEvent.press(getByText(storeCard.cta));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Store', params);
  });
});
