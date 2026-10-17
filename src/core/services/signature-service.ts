export interface SignaturePayload {
  usuarioId: string;
  hashDocumento: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
}

export interface SignatureService {
  assinar(payload: SignaturePayload): Promise<string>;
}