/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permet les images depuis des domaines externes (avatars Clerk, etc.)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
};

export default nextConfig;
