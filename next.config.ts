import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "@react-pdf/renderer", "nodemailer"],
  outputFileTracingIncludes: {
    "/api/pdf/**": ["./fonts/IPAexMincho.ttf"],
  },
};

export default nextConfig;
