import WebpackObfuscator from 'webpack-obfuscator';

const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'africaphone-vente.firebasestorage.app', pathname: '/**' },
    ],
  },

  webpack: (config, { isServer, dev }) => {
    // Obscurcir uniquement en production côté CLIENT
    // IMPORTANT: Ne jamais obfusquer le code serveur (SSR)
    if (!isServer && !dev) {
      config.plugins.push(
        new WebpackObfuscator({
          // Options LÉGÈRES pour compatibilité Next.js
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.5, // Réduit de 0.75 à 0.5

          // Désactiver console.log en production
          disableConsoleOutput: true,

          // DÉSACTIVER les options qui causent des problèmes avec Next.js
          deadCodeInjection: false,
          debugProtection: false,
          selfDefending: false,

          // Identifiants courts mais pas hexadécimaux (plus stable)
          identifierNamesGenerator: 'mangled',

          // Compact
          compact: true,
          simplify: true,

          // Exclure les noms réservés Next.js/React
          reservedNames: ['^_N_', '^__N', '^__next', '^__webpack'],
          reservedStrings: ['__next', '__webpack', '_next'],
        }, [
          // Exclure TOUS les fichiers critiques Next.js
          '**/webpack*.js',
          '**/framework*.js',
          '**/main*.js',
          '**/pages/**',
          '**/app/**',
          '**/_app*.js',
          '**/_document*.js',
          '**/_error*.js',
          '**/polyfills*.js',
          '**/react*.js',
          '**/node_modules/**',
        ])
      );
    }
    return config;
  },
};

export default nextConfig;

