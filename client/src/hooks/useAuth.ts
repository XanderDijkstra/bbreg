import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MeUser {
  id: string;
  email: string;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await api.get<{ user: MeUser | null }>('/auth/me');
      return data.user;
    },
    staleTime: 60_000,
  });
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ user: MeUser }>('/auth/signin', input),
    onSuccess: (data) => qc.setQueryData(['me'], data.user),
  });
}

export function useSignUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ user: MeUser }>('/auth/signup', input),
    onSuccess: (data) => qc.setQueryData(['me'], data.user),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>('/auth/signout'),
    onSuccess: () => {
      qc.setQueryData(['me'], null);
      qc.clear();
    },
  });
}
