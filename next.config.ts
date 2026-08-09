import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
        source: "/cards/:filename",
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/share-image": [
      "./public/cards/*.jpg",
      "./node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-600-normal.woff",
    ],
  },
  async redirects() {
    return [
      {
        destination: "/cards/:filename",
        permanent: true,
        source: "/cards/v3/:filename",
      },
    ];
  },
};

export default nextConfig;
