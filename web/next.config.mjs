/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.merrjep.al",
      },
      {
        protocol: "https",
        hostname: "media.mirlir.com",
      },
      {
        protocol: "https",
        hostname: "www.njoftime.com",
      },
      {
        protocol: "https",
        hostname: "duashpi.al",
      },
      {
        protocol: "https",
        hostname: "d1ia6vt0h4qxok.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
