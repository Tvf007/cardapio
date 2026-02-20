import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,

  // PERFORMANCE: Otimização de imagens com Next.js Image
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache de imagens otimizadas por 365 dias
    minimumCacheTTL: 60,
  },

  // PERFORMANCE: Otimizar pacotes importados para tree-shaking
  experimental: {
    optimizePackageImports: ["react-icons"],
  },

  // REDIRECTS: Redirecionar raiz para boas-vindas
  async redirects() {
    return [
      {
        source: "/",
        destination: "/boas-vindas",
        permanent: false,
      },
    ];
  },

  // PERFORMANCE: Headers de cache para assets estáticos
  async headers() {
    return [
      {
        // Cache longo para assets estáticos (JS, CSS, imagens)
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache curto para API de sync (permite stale-while-revalidate)
        source: "/api/sync",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=5, stale-while-revalidate=30",
          },
        ],
      },
      {
        // Cache para API de logo
        source: "/api/logo",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=10, stale-while-revalidate=60",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
