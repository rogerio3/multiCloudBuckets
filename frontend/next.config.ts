import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produces .next/standalone for the slim production Docker image.
  output: 'standalone',
  // Keep the traced root at the project dir (an outer lockfile higher in the
  // directory tree would otherwise nest the standalone output).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;