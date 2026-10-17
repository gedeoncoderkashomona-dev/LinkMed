export interface UploadInput {
  nome: string;
  mimeType: string;
  tamanho: number;
  content: ArrayBuffer;
}

export interface UploadOutput {
  url: string;
  hash: string;
}

export interface StorageService {
  upload(input: UploadInput): Promise<UploadOutput>;
  delete(url: string): Promise<void>;
  /** Retorna o conteúdo como data URL (usado para download no mock). */
  read(url: string): Promise<string | null>;
}