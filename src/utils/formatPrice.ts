// src/utils/formatPrice.ts

/**
 * Formate un nombre en chaîne de caractères monétaire en FCFA avec un séparateur de milliers.
 * @param price Le prix à formater.
 * @returns Le prix formaté (ex: "15 000 FCFA").
 */
export const formatPrice = (price: number): string => {
  // Arrondit à l'entier le plus proche et ajoute des espaces comme séparateurs de milliers
  const formattedNumber = Math.round(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedNumber} FCFA`;
};
