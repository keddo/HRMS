import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // pdfkit reads its standard-font .afm metrics from disk at runtime (not bundled by
  // webpack/turbopack), so it must run unbundled from node_modules and have those files
  // explicitly traced into the deployed serverless function.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/reports/attendance.pdf": ["./node_modules/pdfkit/js/data/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
