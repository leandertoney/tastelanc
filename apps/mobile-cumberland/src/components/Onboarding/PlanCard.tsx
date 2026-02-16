/**
 * PlanCard Component
 *
 * Unified plan selection card for paywall.
 * Supports gold/green accents and selection glow.
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/colors';
import { duration, spring, pulse } from '../../constants/animations';

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  perMonthPrice?: string;
  savingsLabel?: string;
  isPopular?: boolean;
  isSelected: boolean;
  onSelect: () => void;
  showGreenGlow?: boolean;
  index?: number;
  baseDelay?: number;
}

export default function PlanCard({
  name,
  price,
  period,
  perMonthPrice,
  savingsLabel,
  isPopular = false,
  isSelected,
  onSelect,
  showGreenGlow = false,
  index = 0,
  baseDelay = 0,
}: PlanCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    const delay = baseDelay + index * 100;

    opacity.value = withDelay(delay, withTiming(1, { duration: duration.normal }));
    scale.value = withDelay(delay, withSpring(1, spring.default));
  }, [index, baseDelay]);

  useEffect(() => {
    if (isSelected && showGreenGlow) {
      glowOpacity.value = withSequence(
        withTiming(0.4, { duration: pulse.duration / 2 }),
        withRepeat(
          withSequence(
            withTiming(0.2, { duration: pulse.duration / 2 }),
            withTiming(0.4, { duration: pulse.duration / 2 })
          ),
          2,
          false
        )
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isSelected, showGreenGlow]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, containerAnimatedStyle]}>
      {isSelected && showGreenGlow && (
        <Animated.View style={[styles.glow, glowAnimatedStyle]} />
      )}

      {savingsLabel && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsText}>{savingsLabel}</Text>
        </View>
      )}

      {isPopular && (
        <View style={styles.popularBadge}>
          <Ionicons name="star" size={10} color={colors.gold} />
          <Text style={styles.popularText}>POPULAR</Text>
        </View>
      )}

      <Pressable
        onPress={onSelect}
        style={[
          styles.container,
          isSelected && styles.containerSelected,
          isPopular && styles.containerPopular,
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          {isSelected && (
            <View style={styles.checkContainer}>
              <Ionicons name="checkmark" size={16} color={colors.valueGreen} />
            </View>
          )}
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.period}>/{period}</Text>
        </View>

        {perMonthPrice && (
          <Text style={styles.perMonth}>{perMonthPrice}/mo</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: colors.valueGreen,
    borderRadius: radius.lg + 4,
    zIndex: -1,
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: colors.valueGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 10,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 8,
    backgroundColor: colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
  },
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 120,
  },
  containerSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.cardBgSelected,
  },
  containerPopular: {
    borderColor: colors.goldBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.valueGreenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  period: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 2,
  },
  perMonth: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
