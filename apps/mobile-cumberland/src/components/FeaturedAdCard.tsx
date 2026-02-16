import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { CARD_WIDTH, CARD_HEIGHT } from './FeaturedCard';
import type { FeaturedAd } from '../types/database';
import { colors, radius, spacing } from '../constants/colors';
import { trackAdClick } from '../lib/ads';

interface FeaturedAdCardProps {
  ad: FeaturedAd;
  positionIndex: number;
}

// Particle configuration
const PARTICLE_COUNT = 6;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  startX: Math.random() * CARD_WIDTH * 0.8 + CARD_WIDTH * 0.1,
  size: Math.random() * 3 + 2,
  delay: Math.random() * 3000,
  duration: 4000 + Math.random() * 3000,
  opacity: 0.15 + Math.random() * 0.25,
}));

// ---------- Sub-components for animation isolation ----------

/** Diagonal light sweep that crosses the card periodically */
function ShimmerSweep({ width = CARD_WIDTH, height = CARD_HEIGHT }: { width?: number; height?: number }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withDelay(2500, withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-width * 1.5, width * 1.5]) },
      { rotate: '25deg' },
    ],
    opacity: interpolate(shimmer.value, [0, 0.3, 0.7, 1], [0, 0.6, 0.6, 0]),
  }));

  return (
    <Animated.View style={[styles.shimmer, { top: -height * 0.2, height: height * 1.5 }, style]} pointerEvents="none">
      <View style={styles.shimmerInner} />
    </Animated.View>
  );
}

/** Single floating particle */
function Particle({ startX, size, delay, duration, opacity, height = CARD_HEIGHT }: (typeof PARTICLES)[0] & { height?: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withDelay(
        delay,
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -height * 0.6]) },
      { translateX: interpolate(progress.value, [0, 0.5, 1], [0, 12, -8]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0.5, 1.2, 0.3]) },
    ],
    opacity: interpolate(progress.value, [0, 0.15, 0.5, 0.85, 1], [0, opacity, opacity, opacity * 0.5, 0]),
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: startX, bottom: height * 0.15, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

/** Pulsing glow on the card border */
function GlowBorder() {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    borderColor: `rgba(108, 99, 255, ${interpolate(glow.value, [0, 1], [0.1, 0.45])})`,
    shadowOpacity: interpolate(glow.value, [0, 1], [0.15, 0.5]),
  }));

  return <Animated.View style={[styles.glowBorder, style]} pointerEvents="none" />;
}

/** Breathing badge animation */
function SponsoredBadge() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255,255,255,${interpolate(pulse.value, [0, 1], [0.12, 0.25])})`,
    borderColor: `rgba(255,255,255,${interpolate(pulse.value, [0, 1], [0.2, 0.45])})`,
  }));

  return (
    <Animated.View style={[styles.sponsoredBadge, style]}>
      <Text style={styles.sponsoredText}>Sponsored</Text>
    </Animated.View>
  );
}

// ---------- Main component (inline carousel card) ----------

export default function FeaturedAdCard({ ad, positionIndex }: FeaturedAdCardProps) {
  const handlePress = () => {
    trackAdClick(ad.id, positionIndex);
    Linking.openURL(ad.click_url).catch((err) => {
      console.warn('Failed to open ad URL:', err);
    });
  };

  const particles = useMemo(() => PARTICLES, []);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: ad.image_url }} style={styles.image} />
        <GlowBorder />
        <ShimmerSweep />
        {particles.map((p) => (
          <Particle key={p.id} {...p} />
        ))}
        <SponsoredBadge />
      </View>
    </TouchableOpacity>
  );
}

// ---------- Exported overlay version for the full-screen popup ----------

export { ShimmerSweep, Particle, GlowBorder, SponsoredBadge, PARTICLES };

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 0,
  },
  shimmer: {
    position: 'absolute',
    left: 0,
    width: 60,
    overflow: 'hidden',
  },
  shimmerInner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  sponsoredBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  sponsoredText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
