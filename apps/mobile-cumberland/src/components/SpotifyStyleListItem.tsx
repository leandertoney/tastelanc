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
}

export default function SpotifyStyleListItem({
  imageUrl,
  title,
  subtitle,
  detail,
  onPress,
  fallbackIcon = 'restaurant',
  accentText,
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
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
