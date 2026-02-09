/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "**.picsum.photos",
      },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/*": ["./data/**"],
      "/": ["./data/**"],
      "/listings/*": ["./data/**"],
    },
  },
};

export default nextConfig;
