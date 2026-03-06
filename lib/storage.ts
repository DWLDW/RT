import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface StorageProvider {
  save(file: File): Promise<{ path: string; filename: string }>;
}

class LocalStorageProvider implements StorageProvider {
  constructor(private readonly basePath: string) {}

  async save(file: File) {
    await mkdir(this.basePath, { recursive: true });
    const ext = path.extname(file.name);
    const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const fullPath = path.join(this.basePath, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, bytes);
    return { path: fullPath, filename };
  }
}

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? 'local';
  if (provider === 'local') {
    return new LocalStorageProvider(process.env.UPLOAD_DIR ?? '/data/uploads');
  }
  throw new Error('S3 provider not configured yet. Set STORAGE_PROVIDER=local for now.');
}
