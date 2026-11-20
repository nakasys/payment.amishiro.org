import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "@react-pdf/renderer"],
};

export default nextConfig;
