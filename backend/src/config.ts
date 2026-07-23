import 'dotenv/config';
import path from 'node:path';

export type StorageProviderName = 'mock' | 'aws' | 'gcp' | 'azure';

export interface AppConfig {
  port: number;
  host: string;
  /** Public base URL of this API (used by the mock provider to build "presigned" URLs). */
  publicUrl: string;
  corsOrigin: string | string[];
  jwtSecret: string;
  /** Token lifetime in seconds. */
  jwtExpiresIn: number;
  databaseUrl: string;
  adminPassword: string;
  viewerPassword: string;
  storageProvider: StorageProviderName;
  presignDefaultExpiresIn: number;
  presignMaxExpiresIn: number;
  mock: { dataDir: string };
  aws: {
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
  };
  gcp: {
    projectId?: string;
    bucket: string;
    keyFilename?: string;
  };
  azure: {
    connectionString?: string;
    container: string;
  };
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const PROVIDERS: StorageProviderName[] = ['mock', 'aws', 'gcp', 'azure'];

/**
 * Loads configuration from environment variables, applying optional
 * programmatic overrides (used by tests). See `.env.example` for docs.
 */
export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const env = process.env;
  const provider = (env.STORAGE_PROVIDER ?? 'mock') as StorageProviderName;
  if (!PROVIDERS.includes(provider)) {
    throw new Error(`Invalid STORAGE_PROVIDER "${provider}". Expected one of: ${PROVIDERS.join(', ')}`);
  }

  const port = int(env.PORT, 3001);
  const corsOriginRaw = env.CORS_ORIGIN ?? 'http://localhost:3000';

  const config: AppConfig = {
    port,
    host: env.HOST ?? '0.0.0.0',
    publicUrl: env.PUBLIC_URL ?? `http://localhost:${port}`,
    corsOrigin: corsOriginRaw === '*' ? '*' : corsOriginRaw.split(',').map((o) => o.trim()),
    jwtSecret: env.JWT_SECRET ?? 'dev-secret-change-me',
    jwtExpiresIn: int(env.JWT_EXPIRES_IN, 8 * 60 * 60),
    databaseUrl: env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/logaccess',
    adminPassword: env.ADMIN_PASSWORD ?? 'admin123',
    viewerPassword: env.VIEWER_PASSWORD ?? 'viewer123',
    storageProvider: provider,
    presignDefaultExpiresIn: int(env.PRESIGN_DEFAULT_EXPIRES_IN, 3600),
    presignMaxExpiresIn: int(env.PRESIGN_MAX_EXPIRES_IN, 86400),
    mock: { dataDir: path.resolve(env.MOCK_DATA_DIR ?? './mock-data') },
    aws: {
      region: env.AWS_REGION ?? 'us-east-1',
      bucket: env.AWS_BUCKET ?? '',
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      endpoint: env.AWS_ENDPOINT,
    },
    gcp: {
      projectId: env.GCP_PROJECT_ID,
      bucket: env.GCP_BUCKET ?? '',
      keyFilename: env.GCP_KEY_FILENAME,
    },
    azure: {
      connectionString: env.AZURE_STORAGE_CONNECTION_STRING,
      container: env.AZURE_CONTAINER ?? '',
    },
  };

  return { ...config, ...overrides };
}