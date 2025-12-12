import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 standalone 输出模式，用于 Docker 部署
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "proxy-agent": "./proxy-agent-stub",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Use process.cwd() because __dirname is not defined in ESM config files.
      "proxy-agent": path.resolve(process.cwd(), "proxy-agent-stub"),
    };
    return config;
  },
};

export default nextConfig;
