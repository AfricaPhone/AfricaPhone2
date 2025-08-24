import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  // Test n°1 : Un nombre simple
  it('should format a standard number with a space as a thousands separator', () => {
    expect(formatPrice(15000)).toBe('15 000 FCFA');
  });

  // Test n°2 : Un grand nombre
  it('should handle large numbers correctly', () => {
    expect(formatPrice(1234567)).toBe('1 234 567 FCFA');
  });

  // Test n°3 : Un nombre avec décimales (doit arrondir)
  it('should round a decimal number to the nearest integer', () => {
    expect(formatPrice(99.99)).toBe('100 FCFA');
  });

  // Test n°4 : Le nombre zéro
  it('should format zero correctly', () => {
    expect(formatPrice(0)).toBe('0 FCFA');
  });

  // Test n°5 : Un nombre à 3 chiffres (sans séparateur)
  it('should format a number under 1000 without a separator', () => {
    expect(formatPrice(500)).toBe('500 FCFA');
  });
});
