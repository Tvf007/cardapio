import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,

  // PERFORMANCE: Otimizar pacotes importados para tree-shaking
  experimental: {
    optimizePackageImports: ["react-icons"],
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
