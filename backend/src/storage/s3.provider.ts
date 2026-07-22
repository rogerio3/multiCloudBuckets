import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import type { AppConfig } from '../config';
import { StorageError } from '../errors';
import type { DownloadResult, ListFilesResult, PresignedUrlResult, StorageProvider } from '../types';

function toStorageError(err: unknown, key: string): Error {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  if (e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404) {
    return StorageError.notFound(key);
  }
  return err instanceof Error ? err : new Error(String(err));
}

/** AWS S3 provider backed by AWS SDK v3. */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: AppConfig) {
    const { aws } = config;
    if (!aws.bucket) {
      throw new Error('AWS_BUCKET is required when STORAGE_PROVIDER=aws');
    }
    this.bucket = aws.bucket;
    this.client = new S3Client({
      region: aws.region,
      ...(aws.endpoint ? { endpoint: aws.endpoint, forcePathStyle: true } : {}),
      ...(aws.accessKeyId && aws.secretAccessKey
        ? { credentials: { accessKeyId: aws.accessKeyId, secretAccessKey: aws.secretAccessKey } }
        : {}),
    });
  }

  async listFiles(prefix = '', maxKeys = 100): Promise<ListFilesResult> {
    const res = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, MaxKeys: maxKeys }),
    );
    const files = (res.Contents ?? [])
      .filter((o): o is typeof o & { Key: string } => Boolean(o.Key) && !o.Key!.endsWith('/'))
      .map((o) => ({
        key: o.Key,
        name: o.Key.split('/').pop() ?? o.Key,
        size: o.Size ?? 0,
        lastModified: (o.LastModified ?? new Date(0)).toISOString(),
        etag: o.ETag?.replace(/"/g, ''),
      }));
    return {
      files,
      isTruncated: res.IsTruncated ?? false,
      nextMarker: res.NextContinuationToken ?? null,
    };
  }

  async downloadFile(key: string): Promise<DownloadResult> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        stream: res.Body as Readable,
        metadata: {
          key,
          size: res.ContentLength ?? 0,
          lastModified: (res.LastModified ?? new Date()).toISOString(),
          contentType: res.ContentType ?? 'application/octet-stream',
        },
      };
    } catch (err) {
      throw toStorageError(err, key);
    }
  }

  async generatePresignedUrl(key: string, expiresIn: number): Promise<PresignedUrlResult> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      throw toStorageError(err, key);
    }
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(), key };
  }
}