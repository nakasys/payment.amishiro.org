import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "@react-pdf/renderer", "pdfkit", "nodemailer"],
  outputFileTracingIncludes: {
    "/api/pdf/**": [
      "./fonts/IPAexMincho.ttf",
      "./node_modules/pdfkit/js/data/**/*",
      "./node_modules/pdfkit/js/standard-fonts/**/*",
    ],
  },
};

export default nextConfig;
