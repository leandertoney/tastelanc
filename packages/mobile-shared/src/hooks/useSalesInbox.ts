import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { fetchConversations, fetchUnreadCount, fetchSenderIdentity } from '../lib/salesApi';

export function useSalesInbox(params?: { search?: string; filter?: 'all' | 'unread'; inbox?: 'crm' | 'info' }) {
  return useQuery({
    queryKey: queryKeys.sales.inbox(params?.search, params?.filter, params?.inbox),
    queryFn: () => fetchConversations(params),
    staleTime: 60 * 1000, // 1 min
  });
}

export function useSenderIdentity() {
  return useQuery({
    queryKey: queryKeys.sales.senderIdentity,
    queryFn: fetchSenderIdentity,
    staleTime: 30 * 60 * 1000, // 30 min — identity rarely changes
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.sales.unreadCount,
    queryFn: fetchUnreadCount,
    staleTime: 30 * 1000, // 30 sec
    refetchInterval: 60 * 1000, // poll every minute
  });
}
