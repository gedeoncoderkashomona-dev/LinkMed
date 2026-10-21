import { NotFoundError } from '@/core/domain/errors';
import type { Pop, PopChangeRequest, PopVersion } from '@/core/domain/entities/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';

export interface PopDetailOutput {
  pop: Pop;
  versaoVigente: PopVersion | null;
  versoes: PopVersion[];
  changeRequests: PopChangeRequest[];
  leituraConfirmadaPorMim?: boolean;
}

export class GetPopUseCase {
  constructor(private readonly pops: PopRepository) {}

  async execute(id: string, userId?: string): Promise<PopDetailOutput> {
    const pop = await this.pops.findById(id);
    if (!pop) throw new NotFoundError('POP não encontrado.');

    const [versaoVigente, versoes, changeRequests] = await Promise.all([
      this.pops.findVersaoVigente(id),
      this.pops.listVersions(id),
      this.pops.listChangeRequests(id),
    ]);

    const leituraConfirmadaPorMim =
      versaoVigente && userId
        ? await this.pops.hasConfirmed(versaoVigente.id, userId)
        : false;

    return {
      pop,
      versaoVigente,
      versoes,
      changeRequests,
      leituraConfirmadaPorMim,
    };
  }
}
