export type Role = 'admin' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  /** scrypt hash in the format "salt:hash" (hex) */
  passwordHash: string;
  createdAt: string; // ISO 8601
}

export type PublicUser = Omit<User, 'passwordHash'>;

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

export interface FileMetadata {
  key: string;
  name: string;
  size: number;
  lastModified: string; // ISO 8601
  etag?: string;
}

export interface ListFilesResult {
  files: FileMetadata[];
  isTruncated: boolean;
  nextMarker: string | null;
}

export interface DownloadResult {
  stream: NodeJS.ReadableStream;
  metadata: {
    key: string;
    size: number;
    lastModified: string;
    contentType: string;
  };
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: string; // ISO 8601
  key: string;
}

/**
 * Common abstraction over object storage backends (AWS S3, GCP GCS,
 * Azure Blob Storage, and the local mock used for development).
 */
export interface StorageProvider {
  listFiles(prefix?: string, maxKeys?: number): Promise<ListFilesResult>;
  downloadFile(key: string): Promise<DownloadResult>;
  generatePresignedUrl(key: string, expiresIn: number): Promise<PresignedUrlResult>;
}