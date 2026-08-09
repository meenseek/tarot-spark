import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/share-image": [
      "./public/cards/v3/*.jpg",
      "./node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-600-normal.woff",
    ],
  },
};

export default nextConfig;
