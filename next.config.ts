import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 親ディレクトリの別 lockfile を誤ってワークスペースルートに推定しないよう固定
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
