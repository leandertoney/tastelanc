import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/colors';

interface HappyHourBannerProps {
  deal: string; // Primary deal line
  deal2?: string; // Optional second deal line (stacked)
  restaurantName: string;
  timeWindow: string; // e.g., "4pm-6pm" or "Wed 6-11pm"
  imageUrl?: string;
  onPress?: () => void;
  fullWidth?: boolean;
  dealOpacity?: Animated.Value; // Optional opacity for deal text rotation
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
}: HappyHourBannerProps) {
  const DealText = dealOpacity ? (
    <Animated.View style={{ opacity: dealOpacity }}>
      <Text style={[styles.deal, fullWidth && styles.dealLarge]} numberOfLines={1}>
        {deal}
      </Text>
      {deal2 && (
        <Text style={[styles.deal, fullWidth && styles.dealLarge]} numberOfLines={1}>
          {deal2}
        </Text>
      )}
    </Animated.View>
  ) : (
    <View>
      <Text style={[styles.deal, fullWidth && styles.dealLarge]} numberOfLines={1}>
        {deal}
      </Text>
      {deal2 && (
        <Text style={[styles.deal, fullWidth && styles.dealLarge]} numberOfLines={1}>
          {deal2}
        </Text>
      )}
    </View>
  );

  const content = (
    <View style={styles.content}>
      <View style={styles.leftSection}>
        {DealText}
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurantName}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <Ionicons name="time-outline" size={14} color={colors.text} />
        <Text style={styles.timeWindow}>{timeWindow}</Text>
      </View>
    </View>
  );

  const bannerStyle = [
    styles.banner,
    fullWidth && styles.bannerFullWidth,
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
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    color: colors.text,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dealLarge: {
    fontSize: 18,
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 13,
    color: colors.textMuted,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  timeWindow: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
