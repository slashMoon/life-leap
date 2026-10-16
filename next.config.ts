import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["antd", "@ant-design/icons"],
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
