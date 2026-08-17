import { createHmac, randomBytes } from 'node:crypto';

export type StorageUploadIntent = {
  key: string;
  uploadUrl: string;
  expiresAt: Date;
};

export type StorageDownloadIntent = {
  key: string;
  downloadUrl: string;
  expiresAt: Date;
};

export type StorageProvider = {
  createUploadIntent(input: { key: string; contentType: string; contentLength: number; expiresInSeconds: number }): Promise<StorageUploadIntent>;
  createDownloadIntent(input: { key: string; expiresInSeconds: number }): Promise<StorageDownloadIntent>;
};

const DEFAULT_TTL_SECONDS = 300;

export function generatePrivateStorageKey(input: { studentId: string; documentId: string; extension?: string }): string {
  const safeStudent = input.studentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDocument = input.documentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const nonce = randomBytes(24).toString('hex');
  const extension = input.extension?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `private/documents/${safeStudent}/${safeDocument}-${nonce}${extension ? `.${extension}` : ''}`;
}

export function validateStorageKey(key: string): void {
  if (key.length < 20 || key.length > 500) throw new Error('STORAGE_KEY_INVALID');
  if (key.includes('..') || key.startsWith('/') || key.includes('\\') || !/^[a-zA-Z0-9/_-]+(?:\.[a-zA-Z0-9]+)?$/.test(key)) {
    throw new Error('STORAGE_KEY_INVALID');
  }
}

class DisabledStorageProvider implements StorageProvider {
  async createUploadIntent(): Promise<StorageUploadIntent> {
    throw new Error('DOCUMENT_STORAGE_NOT_CONFIGURED');
  }

  async createDownloadIntent(): Promise<StorageDownloadIntent> {
    throw new Error('DOCUMENT_STORAGE_NOT_CONFIGURED');
  }
}

/**
 * A provider-neutral signing contract. The configured endpoint must be a trusted
 * storage gateway that understands the HMAC query contract; this module never
 * exposes provider credentials to clients.
 */
class HmacStorageGateway implements StorageProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly bucket: string,
    private readonly signingKey: string,
  ) {}

  private sign(operation: 'upload' | 'download', key: string, expiresAt: number): string {
    return createHmac('sha256', this.signingKey)
      .update(`${operation}\n${this.bucket}\n${key}\n${expiresAt}`)
      .digest('hex');
  }

  async createUploadIntent(input: { key: string; contentType: string; contentLength: number; expiresInSeconds: number }): Promise<StorageUploadIntent> {
    validateStorageKey(input.key);
    const expiresAt = Math.floor(Date.now() / 1000) + input.expiresInSeconds;
    const signature = this.sign('upload', input.key, expiresAt);
    const uploadUrl = `${this.baseUrl.replace(/\/$/, '')}/${encodeURIComponent(this.bucket)}/${input.key}?operation=upload&expires=${expiresAt}&contentType=${encodeURIComponent(input.contentType)}&contentLength=${input.contentLength}&signature=${signature}`;
    return { key: input.key, uploadUrl, expiresAt: new Date(expiresAt * 1000) };
  }

  async createDownloadIntent(input: { key: string; expiresInSeconds: number }): Promise<StorageDownloadIntent> {
    validateStorageKey(input.key);
    const expiresAt = Math.floor(Date.now() / 1000) + input.expiresInSeconds;
    const signature = this.sign('download', input.key, expiresAt);
    const downloadUrl = `${this.baseUrl.replace(/\/$/, '')}/${encodeURIComponent(this.bucket)}/${input.key}?operation=download&expires=${expiresAt}&signature=${signature}`;
    return { key: input.key, downloadUrl, expiresAt: new Date(expiresAt * 1000) };
  }
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.STORAGE_SIGNED_URL_BASE ?? process.env.STORAGE_ENDPOINT) && Boolean(process.env.STORAGE_BUCKET) && Boolean(process.env.OBJECT_STORAGE_SIGNING_KEY);
}

export function getStorageProvider(): StorageProvider {
  const endpoint = process.env.STORAGE_SIGNED_URL_BASE ?? process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  const signingKey = process.env.OBJECT_STORAGE_SIGNING_KEY;
  if (!endpoint || !bucket || !signingKey) return new DisabledStorageProvider();
  return new HmacStorageGateway(endpoint, bucket, signingKey);
}

export function storageTtlSeconds(): number {
  const parsed = Number(process.env.SIGNED_URL_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
  return Number.isFinite(parsed) && parsed >= 60 && parsed <= 900 ? Math.floor(parsed) : DEFAULT_TTL_SECONDS;
}

export function extensionForMime(mimeType: string): string | undefined {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'text/plain': 'txt',
  };
  return map[mimeType];
}

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'text/plain']);
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
