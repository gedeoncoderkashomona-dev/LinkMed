import { hashService } from '@/infra/crypto';
import { SupabaseStorageService } from './supabase-storage-service';

export const storageService = new SupabaseStorageService(hashService);