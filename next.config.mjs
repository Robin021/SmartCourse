import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "proxy-agent": "./proxy-agent-stub",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "proxy-agent": path.resolve(__dirname, "proxy-agent-stub"),
    };
    return config;
  },
};

export default nextConfig;
