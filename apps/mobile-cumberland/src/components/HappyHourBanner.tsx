import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/colors';
import { BRAND } from '../config/brand';

interface HappyHourBannerProps {
  deal: string; // Primary deal line
  deal2?: string; // Optional second deal line (stacked)
  restaurantName: string;
  timeWindow: string; // e.g., "4pm-6pm" or "Wed 6-11pm"
  imageUrl?: string;
  onPress?: () => void;
  fullWidth?: boolean;
  dealOpacity?: Animated.Value; // Optional opacity for deal text rotation
  isElite?: boolean;
}

export default function HappyHourBanner({
  deal,
  deal2,
  restaurantName,
  timeWindow,
  imageUrl,
  onPress,
  fullWidth = false,
  dealOpacity,
  isElite = false,
}: HappyHourBannerProps) {
  const hasImage = !!imageUrl;

  // On dark overlay, text must be white; on solid bg, use theme colors
  const textColor = hasImage ? '#FFFFFF' : colors.text;
  const mutedColor = hasImage ? 'rgba(255,255,255,0.7)' : colors.textMuted;

  const DealText = dealOpacity ? (
    <Animated.View style={{ opacity: dealOpacity }}>
      <Text style={[styles.deal, fullWidth && styles.dealLarge, { color: textColor }]} numberOfLines={1}>
        {deal}
      </Text>
      {deal2 && (
        <Text style={[styles.deal, fullWidth && styles.dealLarge, { color: textColor }]} numberOfLines={1}>
          {deal2}
        </Text>
      )}
    </Animated.View>
  ) : (
    <View>
      <Text style={[styles.deal, fullWidth && styles.dealLarge, { color: textColor }]} numberOfLines={1}>
        {deal}
      </Text>
      {deal2 && (
        <Text style={[styles.deal, fullWidth && styles.dealLarge, { color: textColor }]} numberOfLines={1}>
          {deal2}
        </Text>
      )}
    </View>
  );

  const content = (
    <View style={styles.content}>
      <View style={styles.leftSection}>
        {DealText}
        <View style={styles.restaurantRow}>
          {isElite && (
            <>
              <Ionicons name="star" size={9} color={colors.gold} />
              <Text style={styles.pickLabel}>{BRAND.pickBadgeLabel}</Text>
              <Text style={[styles.pickDot, { color: mutedColor }]}>·</Text>
            </>
          )}
          <Text style={[styles.restaurantName, { color: mutedColor }]} numberOfLines={1}>
            {restaurantName}
          </Text>
        </View>
      </View>
      <View style={[styles.rightSection, hasImage && styles.rightSectionOverlay]}>
        <Ionicons name="time-outline" size={14} color={hasImage ? '#FFFFFF' : colors.textOnAccent} />
        <Text style={[styles.timeWindow, { color: hasImage ? '#FFFFFF' : colors.textOnAccent }]}>{timeWindow}</Text>
      </View>
    </View>
  );

  const bannerStyle = [
    styles.banner,
    fullWidth && styles.bannerFullWidth,
    isElite && styles.bannerElite,
  ];

  if (imageUrl) {
    return (
      <TouchableOpacity
        style={bannerStyle}
        onPress={onPress}
        activeOpacity={0.9}
        disabled={!onPress}
      >
        <ImageBackground
          source={{ uri: imageUrl, cache: 'reload' }}
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.imageOverlay}>{content}</View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[bannerStyle, styles.solidBanner]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 72,
    marginRight: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    minWidth: 280,
    maxWidth: 320,
  },
  bannerFullWidth: {
    minWidth: undefined,
    maxWidth: undefined,
    marginRight: 0,
    height: 88,
  },
  bannerElite: {
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  solidBanner: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  imageStyle: {
    borderRadius: radius.md,
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  leftSection: {
    flex: 1,
    marginRight: spacing.sm,
  },
  deal: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  dealLarge: {
    fontSize: 18,
    marginBottom: 4,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
  },
  pickDot: {
    fontSize: 11,
  },
  restaurantName: {
    fontSize: 13,
    flexShrink: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  rightSectionOverlay: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  timeWindow: {
    fontSize: 12,
    fontWeight: '600',
  },
});
