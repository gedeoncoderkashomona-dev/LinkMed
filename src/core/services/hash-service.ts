export interface HashService {
  sha256(content: ArrayBuffer | string): Promise<string>;
}