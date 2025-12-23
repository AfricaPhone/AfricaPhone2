// Configuration Next.js avec suppression des console.log en production via Terser
// Compatible avec next/font et SSR Firebase

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

  // Configuration du compilateur SWC pour supprimer les console.log en production
  compiler: {
    // Supprimer tous les console.* en production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Garder console.error et console.warn pour le débogage critique
    } : false,
  },
};

export default nextConfig;
