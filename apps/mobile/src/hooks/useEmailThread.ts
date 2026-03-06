import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { fetchThread } from '../lib/salesApi';

export function useEmailThread(counterpartyEmail: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.sales.thread(counterpartyEmail),
    queryFn: () => fetchThread(counterpartyEmail),
    enabled: !!counterpartyEmail,
    staleTime: 30 * 1000,
    // Opening a thread marks messages as read — invalidate unread count
    meta: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.unreadCount });
        queryClient.invalidateQueries({ queryKey: ['sales', 'inbox'] });
      },
    },
  });

  return query;
}
