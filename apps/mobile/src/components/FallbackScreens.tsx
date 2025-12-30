import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

interface FallbackProps {
  onRetry?: () => void;
  message?: string;
}

/**
 * Network error fallback - shown when API calls fail
 */
export function NetworkErrorFallback({ onRetry, message }: FallbackProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, styles.networkIcon]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
      </View>
      <Text style={styles.title}>Connection Error</Text>
      <Text style={styles.message}>
        {message || "We couldn't connect to the server. Please check your internet connection."}
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={18} color="#FFF" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Empty state fallback - shown when no data is available
 */
export function EmptyStateFallback({
  message,
  icon = 'restaurant-outline',
  actionLabel,
  onAction,
}: FallbackProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, styles.emptyIcon]}>
        <Ionicons name={icon} size={48} color="#999" />
      </View>
      <Text style={styles.title}>Nothing Here Yet</Text>
      <Text style={styles.message}>
        {message || 'No items to display at the moment.'}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Offline mode fallback - shown when device is offline
 */
export function OfflineFallback({ onRetry }: FallbackProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, styles.offlineIcon]}>
        <Ionicons name="wifi-outline" size={48} color="#888" />
        <View style={styles.offlineSlash} />
      </View>
      <Text style={styles.title}>You're Offline</Text>
      <Text style={styles.message}>
        Please connect to the internet to browse restaurants and specials.
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={18} color="#FFF" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Loading error fallback - shown when data fails to load
 */
export function LoadingErrorFallback({ onRetry, message }: FallbackProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, styles.loadingErrorIcon]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
      </View>
      <Text style={styles.title}>Failed to Load</Text>
      <Text style={styles.message}>
        {message || "We couldn't load the content. Please try again."}
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={18} color="#FFF" />
          <Text style={styles.retryText}>Reload</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * No search results fallback
 */
export function NoResultsFallback({
  searchTerm,
  onClear,
}: {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, styles.searchIcon]}>
        <Ionicons name="search-outline" size={48} color="#888" />
      </View>
      <Text style={styles.title}>No Results Found</Text>
      <Text style={styles.message}>
        {searchTerm
          ? `We couldn't find anything matching "${searchTerm}"`
          : 'Try adjusting your search or filters'}
      </Text>
      {onClear && (
        <TouchableOpacity style={styles.actionButton} onPress={onClear}>
          <Text style={styles.actionText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Permission denied fallback
 */
export function PermissionDeniedFallback({
  permissionType,
  onOpenSettings,
}: {
  permissionType: string;
  onOpenSettings?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, styles.permissionIcon]}>
        <Ionicons name="lock-closed-outline" size={48} color="#888" />
      </View>
      <Text style={styles.title}>Permission Required</Text>
      <Text style={styles.message}>
        TasteLanc needs {permissionType} permission to provide this feature.
      </Text>
      {onOpenSettings && (
        <TouchableOpacity style={styles.actionButton} onPress={onOpenSettings}>
          <Ionicons name="settings-outline" size={16} color={colors.accent} />
          <Text style={styles.actionText}>Open Settings</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Inline error banner - for non-blocking errors
 */
export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <View style={styles.banner}>
      <Ionicons name="warning-outline" size={20} color={colors.error} />
      <Text style={styles.bannerText} numberOfLines={2}>
        {message}
      </Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  networkIcon: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
  },
  emptyIcon: {
    backgroundColor: '#f0f0f0',
  },
  offlineIcon: {
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  offlineSlash: {
    position: 'absolute',
    width: 60,
    height: 3,
    backgroundColor: '#888',
    transform: [{ rotate: '45deg' }],
  },
  loadingErrorIcon: {
    backgroundColor: 'rgba(164, 30, 34, 0.1)',
  },
  searchIcon: {
    backgroundColor: '#f0f0f0',
  },
  permissionIcon: {
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.accent,
    gap: 6,
  },
  actionText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
});
