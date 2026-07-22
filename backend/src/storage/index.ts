import type { AppConfig } from '../config';
import type { StorageProvider } from '../types';

/**
 * Factory for the configured storage provider. Provider SDKs are imported
 * lazily so running with the mock provider doesn't pay the startup cost of
 * loading the AWS/GCP/Azure SDKs.
 */
export async function createStorageProvider(config: AppConfig): Promise<StorageProvider> {
  switch (config.storageProvider) {
    case 'aws': {
      const { S3StorageProvider } = await import('./s3.provider');
      return new S3StorageProvider(config);
    }
    case 'gcp': {
      const { GcsStorageProvider } = await import('./gcs.provider');
      return new GcsStorageProvider(config);
    }
    case 'azure': {
      const { AzureBlobStorageProvider } = await import('./azure.provider');
      return new AzureBlobStorageProvider(config);
    }
    case 'mock':
    default: {
      const { MockStorageProvider } = await import('./mock.provider');
      return new MockStorageProvider(config);
    }
  }
}