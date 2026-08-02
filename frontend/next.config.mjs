/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://orchestraos.onrender.com/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
