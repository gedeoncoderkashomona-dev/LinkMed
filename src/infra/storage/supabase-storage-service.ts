import { ValidationError } from '@/core/domain/errors';
import type { HashService } from '@/core/services/hash-service';
import type {
  StorageService,
  UploadInput,
  UploadOutput,
} from '@/core/services/storage-service';
import { supabaseAdmin } from '@/infra/db/supabase/client';

const BUCKET = 'pops';
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = ['application/pdf'];
const URL_PREFIX = `supabase://${BUCKET}/`;

/**
 * Storage de arquivos de POP no Supabase Storage (bucket privado).
 * O bucket é criado sob demanda na primeira utilização.
 */
export class SupabaseStorageService implements StorageService {
  private bucketReady: Promise<void> | null = null;

  constructor(private readonly hasher: HashService) {}

  private ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
          public: false,
          fileSizeLimit: MAX_BYTES,
          allowedMimeTypes: ALLOWED_MIME,
        });
        // "already exists" não é erro.
        if (error && !/already exists|duplicate/i.test(error.message)) {
          this.bucketReady = null;
          throw new Error(`Falha ao preparar o bucket de arquivos: ${error.message}`);
        }
      })();
    }
    return this.bucketReady;
  }

  async upload(input: UploadInput): Promise<UploadOutput> {
    if (input.tamanho > MAX_BYTES) {
      throw new ValidationError(`Arquivo excede o limite de ${MAX_BYTES / 1024 / 1024} MB.`);
    }
    if (!ALLOWED_MIME.includes(input.mimeType)) {
      throw new ValidationError('Apenas arquivos PDF são permitidos.');
    }

    const hash = await this.hasher.sha256(input.content);
    await this.ensureBucket();

    const path = `${hash}.pdf`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(input.content), {
        contentType: input.mimeType,
        upsert: true,
      });
    if (error) throw new Error(`Falha ao enviar arquivo: ${error.message}`);

    return { url: `${URL_PREFIX}${path}`, hash };
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(URL_PREFIX)) return;
    await supabaseAdmin.storage.from(BUCKET).remove([url.slice(URL_PREFIX.length)]);
  }

  async read(url: string): Promise<string | null> {
    if (!url.startsWith(URL_PREFIX)) return null;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(url.slice(URL_PREFIX.length));
    if (error || !data) return null;
    const base64 = Buffer.from(await data.arrayBuffer()).toString('base64');
    return `data:application/pdf;base64,${base64}`;
  }
}
