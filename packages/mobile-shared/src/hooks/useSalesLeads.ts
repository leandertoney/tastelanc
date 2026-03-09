import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { fetchLeads, fetchLeadDetail } from '../lib/salesApi';

export function useSalesLeads(params?: { status?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: queryKeys.sales.leads(params?.status, params?.search, params?.page),
    queryFn: () => fetchLeads({ ...params, limit: 20 }),
    staleTime: 60 * 1000,
  });
}

export function useLeadDetail(leadId: string) {
  return useQuery({
    queryKey: queryKeys.sales.leadDetail(leadId),
    queryFn: () => fetchLeadDetail(leadId),
    enabled: !!leadId,
    staleTime: 30 * 1000,
  });
}
