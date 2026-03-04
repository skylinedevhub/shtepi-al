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
        hostname: "*.supabase.co",
      },
      // shpi.al
      {
        protocol: "https",
        hostname: "cdn.shpi.al",
      },
      {
        protocol: "https",
        hostname: "shpi.al",
      },
      // century21 + futurehome (BSP CRM CDN)
      {
        protocol: "https",
        hostname: "crm-cdn.ams3.cdn.digitaloceanspaces.com",
      },
      // indomio (Spitogatos network)
      {
        protocol: "https",
        hostname: "m1.spitogatos.gr",
      },
      {
        protocol: "https",
        hostname: "m2.spitogatos.gr",
      },
      {
        protocol: "https",
        hostname: "m3.spitogatos.gr",
      },
      // kerko360
      {
        protocol: "https",
        hostname: "kerko360.al",
      },
      // propertyhub (WordPress)
      {
        protocol: "https",
        hostname: "propertyhub.al",
      },
      // realestate.al
      {
        protocol: "https",
        hostname: "www.realestate.al",
      },
      {
        protocol: "https",
        hostname: "realestate.al",
      },
      // homezone
      {
        protocol: "https",
        hostname: "homezone.al",
      },
    ],
  },
};

export default nextConfig;
