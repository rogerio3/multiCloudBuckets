import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config';
import { StorageError } from '../errors';
import type { DownloadResult, ListFilesResult, PresignedUrlResult, StorageProvider } from '../types';
import { generateSampleFiles } from './sample-data';

/**
 * Local filesystem-backed provider used for development and tests.
 * Seeds realistic sample log files on first use; no cloud credentials needed.
 */
export class MockStorageProvider implements StorageProvider {
  private readonly dataDir: string;
  private readonly publicUrl: string;

  constructor(config: AppConfig) {
    this.dataDir = config.mock.dataDir;
    this.publicUrl = config.publicUrl;
    this.seed();
  }

  private seed(): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    if (fs.readdirSync(this.dataDir).length > 0) return;
    for (const file of generateSampleFiles()) {
      const filePath = this.safePath(file.key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, 'utf8');
    }
  }

  /** Resolves a key inside the data directory, blocking path traversal. */
  private safePath(key: string): string {
    const resolved = path.resolve(this.dataDir, key);
    if (resolved !== this.dataDir && !resolved.startsWith(this.dataDir + path.sep)) {
      throw new StorageError('Invalid key', 400, 'InvalidKey');
    }
    return resolved;
  }

  /** Recursively lists all file keys (POSIX-style separators) under a directory. */
  private walk(dir: string, prefix = ''): string[] {
    const keys: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        keys.push(...this.walk(path.join(dir, entry.name), rel));
      } else if (entry.isFile()) {
        keys.push(rel);
      }
    }
    return keys;
  }

  async listFiles(prefix = '', maxKeys = 100): Promise<ListFilesResult> {
    const keys = this.walk(this.dataDir)
      .filter((k) => k.startsWith(prefix))
      .sort();
    const page = keys.slice(0, maxKeys);
    const files = page.map((key) => {
      const stat = fs.statSync(this.safePath(key));
      return {
        key,
        name: path.basename(key),
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
        etag: `mock-${stat.size}-${Math.floor(stat.mtimeMs)}`,
      };
    });
    const isTruncated = keys.length > maxKeys;
    return {
      files,
      isTruncated,
      nextMarker: isTruncated && files.length > 0 ? files[files.length - 1].key : null,
    };
  }

  async downloadFile(key: string): Promise<DownloadResult> {
    const filePath = this.safePath(key);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
      if (!stat.isFile()) throw new Error('not a regular file');
    } catch {
      throw StorageError.notFound(key);
    }
    return {
      stream: fs.createReadStream(filePath),
      metadata: {
        key,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
        contentType: 'text/plain',
      },
    };
  }

  async generatePresignedUrl(key: string, expiresIn: number): Promise<PresignedUrlResult> {
    const filePath = this.safePath(key);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw StorageError.notFound(key);
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    // Mock mode has no real object-store URL; point at the authenticated
    // download endpoint so the flow can be exercised end-to-end locally.
    return {
      url: `${this.publicUrl}/api/logs/${encodeURIComponent(key)}/download`,
      expiresAt: expiresAt.toISOString(),
      key,
    };
  }
}