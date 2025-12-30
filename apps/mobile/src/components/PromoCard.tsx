import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, radius, spacing } from '../constants/colors';

const UNIVERSOLE_URL = 'https://universoleappstudios.com';

// Gold color with transparency for border
const GOLD_BORDER = 'rgba(255, 215, 0, 0.25)';
const GOLD_BG = 'rgba(255, 215, 0, 0.15)';
const GOLD_SOLID = '#FFD700';

interface PromoCardProps {
  variant: 'compact' | 'full';
  onDismiss?: () => void;
}

export default function PromoCard({ variant, onDismiss }: PromoCardProps) {
  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(100, withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handlePress = () => {
    Linking.openURL(UNIVERSOLE_URL).catch((err) => {
      console.error('Failed to open URL:', err);
    });
  };

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
    translateY.value = withTiming(20, { duration: 200, easing: Easing.out(Easing.ease) }, () => {
      if (onDismiss) {
        runOnJS(onDismiss)();
      }
    });
  };

  if (variant === 'compact') {
    return (
      <Animated.View style={[styles.compactCard, animatedStyle]}>
        <TouchableOpacity
          style={styles.compactTouchable}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {/* Icon Container */}
          <View style={styles.compactIconContainer}>
            <Ionicons name="code-slash" size={24} color={GOLD_SOLID} />
          </View>

          {/* Content */}
          <View style={styles.compactContent}>
            <Text style={styles.compactHeadline}>Like TasteLanc?</Text>
            <Text style={styles.compactSubtext}>Got an app idea? Let's build it.</Text>
          </View>

          {/* CTA Button */}
          <View style={styles.compactCta}>
            <Text style={styles.compactCtaText}>Let's Talk</Text>
          </View>
        </TouchableOpacity>

        {/* Dismiss Button */}
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  // Full variant
  return (
    <Animated.View style={[styles.fullCard, animatedStyle]}>
      <TouchableOpacity
        style={styles.fullTouchable}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Visual Area */}
        <View style={styles.fullVisualArea}>
          <View style={styles.fullIconCircle}>
            <Ionicons name="code-slash" size={40} color={GOLD_SOLID} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.fullContent}>
          <Text style={styles.fullHeadline}>Like TasteLanc?</Text>
          <Text style={styles.fullSubtext}>
            Got an app idea? Let's build it together.
          </Text>

          {/* CTA Button */}
          <View style={styles.fullCtaButton}>
            <Text style={styles.fullCtaText}>Let's Talk</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Dismiss Button */}
      {onDismiss && (
        <TouchableOpacity
          style={styles.fullDismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Compact variant styles (matches CompactRestaurantCard)
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  compactTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  compactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: GOLD_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContent: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  compactHeadline: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  compactSubtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
  compactCta: {
    backgroundColor: GOLD_SOLID,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginRight: 20, // Space for dismiss button
  },
  compactCtaText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Full variant styles (matches RestaurantCard)
  fullCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    shadowColor: GOLD_SOLID,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  fullTouchable: {
    flex: 1,
  },
  fullVisualArea: {
    height: 120,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle gradient effect using a darker background
    borderBottomWidth: 1,
    borderBottomColor: GOLD_BORDER,
  },
  fullIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GOLD_BG,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GOLD_BORDER,
  },
  fullContent: {
    padding: 12,
  },
  fullHeadline: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  fullSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  fullCtaButton: {
    backgroundColor: GOLD_SOLID,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.sm,
    gap: 8,
  },
  fullCtaText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  fullDismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
