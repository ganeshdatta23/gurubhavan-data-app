import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@libsql/client', 'exceljs', 'jspdf', 'jspdf-autotable', 'docx'],
};

export default nextConfig;
