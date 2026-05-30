import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LanceDB 是带原生二进制的服务端包，不能被 Turbopack 打进浏览器/ESM chunk。
  // 标记为 serverExternalPackages 后，它只会在 Node.js 服务端运行时加载。
  serverExternalPackages: ["@lancedb/lancedb"],
};

export default nextConfig;
