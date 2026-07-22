import { Storage } from '@google-cloud/storage';
import type { AppConfig } from '../config';
import { StorageError } from '../errors';
import type { DownloadResult, ListFilesResult, PresignedUrlResult, StorageProvider } from '../types';

/** Google Cloud Storage provider backed by @google-cloud/storage. */
export class GcsStorageProvider implements StorageProvider {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(config: AppConfig) {
    const { gcp } = config;
    if (!gcp.bucket) {
      throw new Error('GCP_BUCKET is required when STORAGE_PROVIDER=gcp');
    }
    this.bucketName = gcp.bucket;
    this.storage = new Storage({
      ...(gcp.projectId ? { projectId: gcp.projectId } : {}),
      ...(gcp.keyFilename ? { keyFilename: gcp.keyFilename } : {}),
    });
  }

  async listFiles(prefix = '', maxKeys = 100): Promise<ListFilesResult> {
    const [files, nextQuery] = await this.storage
      .bucket(this.bucketName)
      .getFiles({ prefix, maxResults: maxKeys, autoPaginate: false });
    const next = (nextQuery ?? null) as { pageToken?: string } | null;
    return {
      files: files
        .filter((f) => !f.name.endsWith('/'))
        .map((f) => ({
          key: f.name,
          name: f.name.split('/').pop() ?? f.name,
          size: Number(f.metadata.size ?? 0),
          lastModified: new Date(f.metadata.updated ?? 0).toISOString(),
          etag: f.metadata.etag,
        })),
      isTruncated: Boolean(next?.pageToken),
      nextMarker: next?.pageToken ?? null,
    };
  }

  async downloadFile(key: string): Promise<DownloadResult> {
    const file = this.storage.bucket(this.bucketName).file(key);
    try {
      const [metadata] = await file.getMetadata();
      return {
        stream: file.createReadStream(),
        metadata: {
          key,
          size: Number(metadata.size ?? 0),
          lastModified: new Date(metadata.updated ?? Date.now()).toISOString(),
          contentType: metadata.contentType ?? 'application/octet-stream',
        },
      };
    } catch (err) {
      if ((err as { code?: number }).code === 404) throw StorageError.notFound(key);
      throw err;
    }
  }

  async generatePresignedUrl(key: string, expiresIn: number): Promise<PresignedUrlResult> {
    const file = this.storage.bucket(this.bucketName).file(key);
    const [exists] = await file.exists();
    if (!exists) throw StorageError.notFound(key);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const [url] = await file.getSignedUrl({ action: 'read', expires: expiresAt });
    return { url, expiresAt: expiresAt.toISOString(), key };
  }
}