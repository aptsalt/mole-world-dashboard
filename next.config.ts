import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGithubPages
    ? {
        output: "export",
        basePath: "/mole-world-dashboard",
        images: { unoptimized: true },
      }
    : {}),
  turbopack: {},
};

export default nextConfig;
