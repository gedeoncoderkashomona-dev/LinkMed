import type { PopWithDetails } from '@/core/domain/entities/pop';
import type { ListPopsFilter, PopRepository } from '@/core/repositories/pop-repository';

export class ListPopsUseCase {
  constructor(private readonly pops: PopRepository) {}

  async execute(filter?: ListPopsFilter): Promise<PopWithDetails[]> {
    return this.pops.listWithDetails(filter);
  }
}
