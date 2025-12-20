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
    // Obscurcir uniquement en production côté client
    if (!isServer && !dev) {
      config.plugins.push(
        new WebpackObfuscator({
          // Niveau modéré d'obscurcissement (équilibre sécurité/performance)
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.75,
          identifierNamesGenerator: 'hexadecimal',

          // Désactiver les console.log en production
          disableConsoleOutput: true,

          // Options de performance (désactivées pour éviter la lenteur)
          deadCodeInjection: false,
          debugProtection: false,
          selfDefending: false,

          // Compact pour réduire la taille
          compact: true,
          simplify: true,
        }, [
          // Exclure les chunks critiques de Next.js pour éviter les erreurs
          'webpack-runtime*.js',
          'framework*.js',
          'main*.js',
        ])
      );
    }
    return config;
  },
};

export default nextConfig;
