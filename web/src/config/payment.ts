export const PAYMENT_CONFIG = {
  VOTE_AMOUNT_XOF: 100,
  KKIAPAY_PUBLIC_KEY: process.env.NEXT_PUBLIC_KKIAPAY_KEY || '',
  SANDBOX: process.env.NEXT_PUBLIC_KKIAPAY_SANDBOX === 'true',
  FUNCTIONS_REGION: 'europe-west1',
  COUNTRIES: ['BJ'] as const,
  PAYMENT_METHODS: ['momo', 'card'] as const,
  PRODUCT_PAYMENT_THEME: '#059669',
};

export type PaymentConfig = typeof PAYMENT_CONFIG;
