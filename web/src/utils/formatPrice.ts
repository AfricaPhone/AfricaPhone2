export const formatPrice = (price: number | null | undefined): string => {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    return 'Prix à confirmer';
  }

  const formattedNumber = Math.round(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${formattedNumber} FCFA`;
};
