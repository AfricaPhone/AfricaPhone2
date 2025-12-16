// src/config/payment.ts
// Configuration centralisée pour l’intégration KKiaPay

export const PAYMENT_CONFIG = {
  VOTE_AMOUNT_XOF: 100,

  KKIAPAY_PUBLIC_KEY: process.env.EXPO_PUBLIC_KKIAPAY_KEY || '',

  SANDBOX: false,

  FUNCTIONS_REGION: 'europe-west1',

  COUNTRIES: ['BJ'] as const,
  PAYMENT_METHODS: ['momo', 'card'] as const,
};

export function computeVotesFromAmount(amountXof: number, unitXof = PAYMENT_CONFIG.VOTE_AMOUNT_XOF) {
  const units = Math.max(1, Math.floor(amountXof / unitXof));
  return units;
}
