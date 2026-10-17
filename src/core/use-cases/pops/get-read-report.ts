import { NotFoundError } from '@/core/domain/errors';
import type { PopVersion } from '@/core/domain/entities/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { UserRepository } from '@/core/repositories/user-repository';

export interface ReadReportEntry {
  userId: string;
  nomeCompleto: string;
  email: string;
  perfil: string;
  setor: string | null;
  confirmadoEm: Date | null;
}

export interface ReadReportOutput {
  versaoVigente: PopVersion;
  totalEsperado: number;
  totalConfirmado: number;
  lidos: ReadReportEntry[];
  pendentes: ReadReportEntry[];
}

export class GetReadReportUseCase {
  constructor(
    private readonly pops: PopRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(popId: string): Promise<ReadReportOutput> {
    const vigente = await this.pops.findVersaoVigente(popId);
    if (!vigente) {
      throw new NotFoundError('Nenhuma versão vigente encontrada para este POP.');
    }

    const allUsers = await this.users.list();
    // Consideramos usuários ativos não-diretores como público-alvo de leitura
    const targetUsers = allUsers.filter((u) => u.status === 'ativo' && u.perfil !== 'diretor');
    const confirmations = await this.pops.listConfirmations(vigente.id);
    const confirmedMap = new Map(confirmations.map((c) => [c.userId, c.confirmadoEm]));

    const lidos: ReadReportEntry[] = [];
    const pendentes: ReadReportEntry[] = [];

    for (const u of targetUsers) {
      const confirmadoEm = confirmedMap.get(u.id);
      const entry: ReadReportEntry = {
        userId: u.id,
        nomeCompleto: u.nomeCompleto,
        email: u.email,
        perfil: u.perfil,
        setor: null,
        confirmadoEm: confirmadoEm ?? null,
      };

      if (confirmadoEm) {
        lidos.push(entry);
      } else {
        pendentes.push(entry);
      }
    }

    return {
      versaoVigente: vigente,
      totalEsperado: targetUsers.length,
      totalConfirmado: lidos.length,
      lidos,
      pendentes,
    };
  }
}
