import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/colors';

interface SpotifyStyleListItemProps {
  imageUrl: string | null;
  title: string;
  subtitle: string;
  detail?: string;
  onPress: () => void;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  accentText?: string;
  timeBadge?: string;
}

export default function SpotifyStyleListItem({
  imageUrl,
  title,
  subtitle,
  detail,
  onPress,
  fallbackIcon = 'restaurant',
  accentText,
  timeBadge,
}: SpotifyStyleListItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Image or Fallback Icon */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl, cache: 'reload' }} style={styles.image} />
        ) : (
          <View style={styles.fallbackContainer}>
            <Ionicons name={fallbackIcon} size={24} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {timeBadge && (
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>{timeBadge}</Text>
            </View>
          )}
        </View>
        {accentText && (
          <Text style={styles.accentText} numberOfLines={1}>
            {accentText}
          </Text>
        )}
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        {detail && (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.cardBgElevated,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  timeBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accentText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  detail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
