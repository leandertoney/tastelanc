/**
 * Auth hook - re-exported from AuthContext for convenience
 *
 * Usage:
 * const { userId, isAuthenticated, isAnonymous, isLoading } = useAuth();
 *
 * The userId is a real Supabase UUID that can be used for:
 * - Premium status lookup
 * - Favorites sync
 * - Votes tracking
 * - Mollie personalization
 */
export { useAuth } from '../context/AuthContext';
