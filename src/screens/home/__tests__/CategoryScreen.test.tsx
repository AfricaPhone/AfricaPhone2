import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import CategoryScreen from '../CategoryScreen';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { useBoutique } from '../../../store/BoutiqueContext';
import { useProducts } from '../../../store/ProductContext';

const mockPromoCardsCarousel = jest.fn(() => null);

jest.mock('../PromoCardsCarousel', () => (props: any) => {
  mockPromoCardsCarousel(props);
  return null;
});

jest.mock('../ProductGrid', () => ({ listHeaderComponent }: { listHeaderComponent?: React.ReactNode }) => (
  <>{listHeaderComponent}</>
));

jest.mock('../../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: jest.fn(),
}));

jest.mock('../../../store/BoutiqueContext', () => ({
  useBoutique: jest.fn(),
}));

jest.mock('../../../store/ProductContext', () => ({
  useProducts: jest.fn(),
}));

jest.mock('../../../firebase/config', () => ({
  db: {},
}));

const mockGetDocs = jest.fn(async () => ({ docs: [] }));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  collection: jest.fn(() => ({})),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  limit: jest.fn((value: unknown) => value),
  orderBy: jest.fn((value: unknown) => value),
  query: jest.fn((ref: unknown) => ref),
  startAfter: jest.fn((value: unknown) => value),
  where: jest.fn((value: unknown) => value),
  FirebaseFirestoreTypes: {},
}));

const mockedUseFeatureFlags = useFeatureFlags as jest.MockedFunction<typeof useFeatureFlags>;
const mockedUseBoutique = useBoutique as jest.MockedFunction<typeof useBoutique>;
const mockedUseProducts = useProducts as jest.MockedFunction<typeof useProducts>;

describe('CategoryScreen promo cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPromoCardsCarousel.mockClear();
    mockedUseFeatureFlags.mockReturnValue({ promoCardsEnabled: true });
    mockedUseBoutique.mockReturnValue({
      boutiqueInfo: {
        name: 'Africa Phone',
        description: 'La meilleure selection',
        coverImageUrl: 'https://example.com/cover.jpg',
        profileImageUrl: 'https://example.com/profile.jpg',
        googleMapsUrl: 'https://maps.example.com',
        whatsappNumber: '+22900000000',
      },
      loading: false,
    });
    mockedUseProducts.mockReturnValue({
      brands: [],
      brandsLoading: false,
    });
    mockGetDocs.mockResolvedValue({ docs: [] });
  });

  const renderCategoryScreen = (category: string = 'Populaires') => {
    render(<CategoryScreen route={{ params: { category } }} />);
  };

  it('passes only the store promo card to the carousel on the Populaires tab', async () => {
    renderCategoryScreen('Populaires');

    await waitFor(() => expect(mockPromoCardsCarousel).toHaveBeenCalled());

    const props = mockPromoCardsCarousel.mock.calls[0][0];

    expect(props.isLoading).toBe(false);
    expect(props.promoCards).toHaveLength(1);
    expect(props.promoCards[0]).toMatchObject({
      id: 'store-info',
      title: 'Africa Phone',
      cta: 'Voir la boutique',
      screen: 'Store',
    });
  });

  it('does not render promo cards when the boutique info is missing', async () => {
    mockedUseBoutique.mockReturnValue({
      boutiqueInfo: null,
      loading: false,
    });

    renderCategoryScreen('Populaires');

    await waitFor(() => {
      expect(mockPromoCardsCarousel).not.toHaveBeenCalled();
    });
  });

  it('skips promo cards on other categories even when enabled', async () => {
    renderCategoryScreen('tablette');

    await waitFor(() => {
      expect(mockPromoCardsCarousel).not.toHaveBeenCalled();
    });
  });
});
