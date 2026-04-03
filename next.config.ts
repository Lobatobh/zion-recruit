import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@prisma/client", "pdf-parse", "mammoth"],
  // Allow cross-origin requests from preview panel
  allowedDevOrigins: [
    "preview-chat-ab18b4b8-40ed-4c21-bd56-723559537414.space.z.ai",
    "preview-chat-7250da5d-b255-4964-aada-018a6344fd0b.space.z.ai",
    ".space.z.ai",
    "localhost:81",
  ],
};

export default nextConfig;
