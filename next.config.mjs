/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Hosting relies on dynamic rendering, no static export needed.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
