import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Vercelでのビルド時にESLintのエラーを無視する
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Vercelでのビルド時にTypeScriptのエラーを無視する
    ignoreBuildErrors: true,
  },
};
export default withPWA(nextConfig);