import type { HashService } from '@/core/services/hash-service';

export class WebCryptoHashService implements HashService {
  async sha256(content: ArrayBuffer | string): Promise<string> {
    const data =
      typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}