export type KkiapayServerConfig = {
  publicKey: string;
  privateKey: string;
  secretKey: string;
  sandbox: boolean;
};

export class KkiapayConfigurationError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.name = 'KkiapayConfigurationError';
    this.status = status;
  }
}

const isTrue = (value: string | undefined) => value === 'true';

const readFirstEnv = (names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
};

export const isKkiapaySandboxMode = () =>
  isTrue(process.env.KKIAPAY_SANDBOX) ||
  isTrue(process.env.KKIA_SANDBOX) ||
  isTrue(process.env.NEXT_PUBLIC_KKIAPAY_SANDBOX);

export const readKkiapayServerConfig = (): KkiapayServerConfig => {
  const sandbox = isKkiapaySandboxMode();
  const publicKey = sandbox
    ? readFirstEnv(['KKIAPAY_SANDBOX_PUBLIC_KEY', 'KKIA_SANDBOX_PUBLIC_KEY', 'NEXT_PUBLIC_KKIAPAY_SANDBOX_KEY'])
    : readFirstEnv([
        'KKIAPAY_LIVE_PUBLIC_KEY',
        'KKIA_LIVE_PUBLIC_KEY',
        'KKIAPAY_PUBLIC_KEY',
        'KKIA_PUBLIC_KEY',
        'NEXT_PUBLIC_KKIAPAY_LIVE_KEY',
        'NEXT_PUBLIC_KKIAPAY_KEY',
      ]);
  const privateKey = sandbox
    ? readFirstEnv(['KKIAPAY_SANDBOX_PRIVATE_KEY', 'KKIA_SANDBOX_PRIVATE_KEY'])
    : readFirstEnv(['KKIAPAY_LIVE_PRIVATE_KEY', 'KKIA_LIVE_PRIVATE_KEY', 'KKIAPAY_PRIVATE_KEY', 'KKIA_PRIVATE_KEY']);
  const secretKey = sandbox
    ? readFirstEnv(['KKIAPAY_SANDBOX_SECRET_KEY', 'KKIA_SANDBOX_SECRET_KEY'])
    : readFirstEnv(['KKIAPAY_LIVE_SECRET_KEY', 'KKIA_LIVE_SECRET_KEY', 'KKIAPAY_SECRET_KEY', 'KKIA_SECRET_KEY']);

  if (!publicKey || !privateKey || !secretKey) {
    throw new KkiapayConfigurationError(
      sandbox
        ? 'Configuration Kkiapay sandbox incomplete. Renseignez les cles sandbox public/private/secret avant de lancer un paiement test.'
        : 'Configuration Kkiapay live incomplete. Renseignez les cles live public/private/secret avant de lancer un paiement reel.'
    );
  }

  return { publicKey, privateKey, secretKey, sandbox };
};
