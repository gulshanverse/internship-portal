import { afterEach, describe, expect, it } from 'vitest';
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES, generatePrivateStorageKey, isStorageConfigured, storageTtlSeconds, validateStorageKey } from './storage';

afterEach(() => {
  delete process.env.STORAGE_ENDPOINT;
  delete process.env.STORAGE_SIGNED_URL_BASE;
  delete process.env.STORAGE_BUCKET;
  delete process.env.OBJECT_STORAGE_SIGNING_KEY;
  delete process.env.SIGNED_URL_TTL_SECONDS;
});

describe('private storage boundary', () => {
  it('generates unpredictable private keys without accepting a client key', () => {
    const first = generatePrivateStorageKey({ studentId: 'student-a', documentId: 'doc-a', extension: 'pdf' });
    const second = generatePrivateStorageKey({ studentId: 'student-a', documentId: 'doc-a', extension: 'pdf' });
    expect(first).toMatch(/^private\/documents\/student-a\/doc-a-[a-f0-9]{48}\.pdf$/);
    expect(second).not.toBe(first);
  });

  it('rejects traversal, absolute, and malformed keys', () => {
    expect(() => validateStorageKey('../private/doc')).toThrow('STORAGE_KEY_INVALID');
    expect(() => validateStorageKey('/private/doc-12345678901234567890')).toThrow('STORAGE_KEY_INVALID');
    expect(() => validateStorageKey('private\\doc-12345678901234567890')).toThrow('STORAGE_KEY_INVALID');
  });

  it('enforces the document MIME and size policy constants', () => {
    expect(ALLOWED_DOCUMENT_MIME_TYPES.has('application/pdf')).toBe(true);
    expect(ALLOWED_DOCUMENT_MIME_TYPES.has('application/x-executable')).toBe(false);
    expect(MAX_DOCUMENT_BYTES).toBe(10 * 1024 * 1024);
  });

  it('requires complete provider configuration and bounds signed URL TTL', () => {
    expect(isStorageConfigured()).toBe(false);
    process.env.STORAGE_ENDPOINT = 'https://storage.test';
    process.env.STORAGE_BUCKET = 'private';
    process.env.OBJECT_STORAGE_SIGNING_KEY = 'test-only-key';
    process.env.SIGNED_URL_TTL_SECONDS = '900';
    expect(isStorageConfigured()).toBe(true);
    expect(storageTtlSeconds()).toBe(900);
    process.env.SIGNED_URL_TTL_SECONDS = '1';
    expect(storageTtlSeconds()).toBe(300);
  });
});
