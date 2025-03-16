import { User } from '@supabase/supabase-js';

export interface UseAuthResult {
  user: User | null;
  loading: boolean;
}

export function useAuth(): UseAuthResult; 