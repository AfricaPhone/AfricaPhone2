export const PAYMENT_CONFIG = {
  VOTE_AMOUNT_XOF: 100,
  KKIAPAY_PUBLIC_KEY: process.env.NEXT_PUBLIC_KKIAPAY_KEY || '',
  SANDBOX: false,
  FUNCTIONS_REGION: 'europe-west1',
  COUNTRIES: ['BJ'] as const,
  PAYMENT_METHODS: ['momo', 'card'] as const,
};

export type PaymentConfig = typeof PAYMENT_CONFIG;
