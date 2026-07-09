/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "flagcdn.com" },
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
  
  serverExternalPackages: ["@react-pdf/renderer"],

  // Lint is run explicitly via `npm run lint` and in CI. Never let a lint
  // finding fail the production build — a deploy should not break over style.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
