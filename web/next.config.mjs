// Configuration Next.js - Sans obfuscation webpack (incompatible avec SSR Firebase)
// La minification native de Next.js offre une protection basique du code

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
};

export default nextConfig;
