import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProductGridCard from './ProductGridCard';
import { FavoritesProvider } from '../store/FavoritesContext';
import { Product } from '../types';

// On crée une fausse fonction "espion" que l'on pourra surveiller
const mockToggleFavorite = jest.fn();

// On simule (mock) le hook useFavorites pour qu'il retourne nos propres valeurs contrôlées
jest.mock('../store/FavoritesContext', () => ({
  // On importe et garde le vrai Provider
  ...jest.requireActual('../store/FavoritesContext'),
  // Mais on remplace le hook par notre simulation
  useFavorites: () => ({
    toggleFavorite: mockToggleFavorite,
    isFav: () => false, // Pour ce test, on dit qu'aucun produit n'est favori au départ
  }),
}));

// On crée un produit factice pour nos tests
const mockProduct: Product = {
  id: 'prod-123',
  title: 'Super Casque Audio',
  price: 15000,
  image: 'https://example.com/image.png',
  category: 'audio',
};

// Un "wrapper" qui fournit le contexte nécessaire à notre composant
const renderWithProvider = (component: React.ReactElement) => {
  return render(<FavoritesProvider>{component}</FavoritesProvider>);
};

describe('ProductGridCard', () => {
  // On s'assure que notre "espion" est réinitialisé avant chaque test
  beforeEach(() => {
    mockToggleFavorite.mockClear();
  });

  it('should render product title and price', () => {
    renderWithProvider(<ProductGridCard product={mockProduct} />);

    // On vérifie que le titre et le prix (formaté) sont bien affichés
    expect(screen.getByText('Super Casque Audio')).toBeTruthy();
    expect(screen.getByText('15 000 FCFA')).toBeTruthy();
  });

  it('should call toggleFavorite when the heart icon is pressed', () => {
    renderWithProvider(<ProductGridCard product={mockProduct} />);

    // CORRECTION : On cherche le bouton par son testID
    const heartButton = screen.getByTestId('heart-button');

    // On simule un clic sur le bouton
    fireEvent.press(heartButton);

    // On vérifie que notre fonction espion a été appelée, et avec le bon ID de produit
    expect(mockToggleFavorite).toHaveBeenCalledWith('prod-123');
    expect(mockToggleFavorite).toHaveBeenCalledTimes(1);
  });
});
