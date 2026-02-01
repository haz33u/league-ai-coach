/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'ddragon.leagueoflegends.com',
      'raw.communitydragon.org',
    ],
  },
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
};

module.exports = nextConfig;
