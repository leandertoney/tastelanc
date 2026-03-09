import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  getProfile,
  getOrCreateProfile,
  updatePremiumStatus,
  hasWebPremium,
  uploadProfileAvatar,
} from '../lib/profile';
import type { Profile, PremiumSource } from '../types/database';

/**
 * Hook to fetch user profile with premium status
 */
export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.user.profile(userId) : ['user', 'profile', null],
    queryFn: () => (userId ? getOrCreateProfile(userId) : null),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to check if user has web premium (from Supabase profile)
 */
export function useWebPremiumStatus(userId: string | null) {
  return useQuery({
    queryKey: userId ? [...queryKeys.user.profile(userId), 'webPremium'] : ['webPremium', null],
    queryFn: () => (userId ? hasWebPremium(userId) : false),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to update premium status
 */
export function useUpdatePremiumStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      premiumActive,
      source,
      expiresAt,
    }: {
      userId: string;
      premiumActive: boolean;
      source: PremiumSource;
      expiresAt: string | null;
    }) => {
      return updatePremiumStatus(userId, premiumActive, source, expiresAt);
    },
    onSuccess: (_, variables) => {
      // Invalidate profile queries to refresh premium status
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.profile(variables.userId),
      });
    },
  });
}

/**
 * Hook to invalidate profile cache (useful after premium status changes)
 */
export function useInvalidateProfile() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.user.profile(userId),
    });
  };
}

/**
 * Hook to upload a profile avatar image.
 * Accepts base64-encoded image data and mime type.
 * Invalidates the profile cache on success so the new avatar_url is picked up.
 */
export function useUploadAvatar(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageBase64, mimeType }: { imageBase64: string; mimeType: string }) =>
      uploadProfileAvatar(imageBase64, mimeType),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
        // Matches the queryKey used by useProfileHeader in ProfileScreen
        queryClient.invalidateQueries({ queryKey: ['displayName', userId] });
      }
    },
  });
}
