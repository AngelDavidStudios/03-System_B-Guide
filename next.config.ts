import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reenvía /api/* al BFF (Sistema C) en localhost:3000.
  // Equivalente al proxy de Vite que usa Sistema A — evita CORS desde el
  // browser y mantiene la cookie iron-session en el mismo host visible.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/:path*",
      },
    ];
  },
};

export default nextConfig;
