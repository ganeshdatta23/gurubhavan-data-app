import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@libsql/client', 'exceljs'],
  // Allow opening the dev server via LAN IP (e.g. http://192.168.x.x:3000)
  // so client chunks / HMR are not blocked with 403.
  allowedDevOrigins: ['192.168.31.56', '127.0.0.1', 'localhost'],
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

