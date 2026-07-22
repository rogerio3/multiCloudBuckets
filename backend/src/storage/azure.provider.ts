import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  type BlobItem,
  type ContainerClient,
} from '@azure/storage-blob';
import type { AppConfig } from '../config';
import { StorageError } from '../errors';
import type { DownloadResult, ListFilesResult, PresignedUrlResult, StorageProvider } from '../types';

function credentialFromConnectionString(conn: string): StorageSharedKeyCredential | undefined {
  const accountName = /AccountName=([^;]+)/.exec(conn)?.[1];
  const accountKey = /AccountKey=([^;]+)/.exec(conn)?.[1];
  return accountName && accountKey ? new StorageSharedKeyCredential(accountName, accountKey) : undefined;
}

/** Azure Blob Storage provider backed by @azure/storage-blob. */
export class AzureBlobStorageProvider implements StorageProvider {
  private readonly container: ContainerClient;
  private readonly credential?: StorageSharedKeyCredential;

  constructor(config: AppConfig) {
    const { azure } = config;
    if (!azure.connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is required when STORAGE_PROVIDER=azure');
    }
    if (!azure.container) {
      throw new Error('AZURE_CONTAINER is required when STORAGE_PROVIDER=azure');
    }
    const service = BlobServiceClient.fromConnectionString(azure.connectionString);
    this.container = service.getContainerClient(azure.container);
    this.credential = credentialFromConnectionString(azure.connectionString);
  }

  async listFiles(prefix = '', maxKeys = 100): Promise<ListFilesResult> {
    const iterator = this.container.listBlobsFlat({ prefix }).byPage({ maxPageSize: maxKeys });
    const { value } = await iterator.next();
    const items = value?.segment?.blobItems ?? [];
    return {
      files: items.map((b: BlobItem) => ({
        key: b.name,
        name: b.name.split('/').pop() ?? b.name,
        size: b.properties.contentLength ?? 0,
        lastModified: (b.properties.lastModified ?? new Date(0)).toISOString(),
        etag: b.properties.etag?.replace(/"/g, ''),
      })),
      isTruncated: Boolean(value?.continuationToken),
      nextMarker: value?.continuationToken ?? null,
    };
  }

  async downloadFile(key: string): Promise<DownloadResult> {
    const blob = this.container.getBlobClient(key);
    try {
      const res = await blob.download();
      if (!res.readableStreamBody) throw new Error('Empty response body');
      return {
        stream: res.readableStreamBody,
        metadata: {
          key,
          size: res.contentLength ?? 0,
          lastModified: (res.lastModified ?? new Date()).toISOString(),
          contentType: res.contentType ?? 'application/octet-stream',
        },
      };
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) throw StorageError.notFound(key);
      throw err;
    }
  }

  async generatePresignedUrl(key: string, expiresIn: number): Promise<PresignedUrlResult> {
    const blob = this.container.getBlockBlobClient(key);
    if (!(await blob.exists())) throw StorageError.notFound(key);
    if (!this.credential) {
      throw new Error('SAS URL generation requires an account key in AZURE_STORAGE_CONNECTION_STRING');
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.container.containerName,
        blobName: key,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(Date.now() - 60 * 1000),
        expiresOn: expiresAt,
      },
      this.credential,
    ).toString();
    return { url: `${blob.url}?${sas}`, expiresAt: expiresAt.toISOString(), key };
  }
}