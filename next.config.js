/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "flagcdn.com" },
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
  
  serverExternalPackages: ["@react-pdf/renderer"],
};

module.exports = nextConfig;
