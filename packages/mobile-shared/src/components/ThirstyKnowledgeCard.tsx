/**
 * ThirstyKnowledgeCard — Compact HomeScreen banner for the TFK partner hub.
 * Same size/shape as CoffeeChocolateTrailBanner and RestaurantWeekBanner.
 * Lancaster-only — returns null for other markets.
 */

import { useRef, useEffect } from 'react';
import { TouchableOpacity, View, Text, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TFK_NAVY   = '#0D1B2A';
const TFK_PURPLE = '#7C3AED';
const TFK_PINK   = '#EC4899';
const TFK_GOLD   = '#FCD34D';
const TFK_GOLD_DIM = 'rgba(252,211,77,0.75)';

export default function ThirstyKnowledgeCard() {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp>();
  const brand = getBrand();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  if (brand.marketSlug !== 'lancaster-pa') return null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => navigation.navigate('ThirstyKnowledge')}
      activeOpacity={0.85}
    >
      {/* Watermark */}
      <Text style={styles.bgBulb}>💡</Text>

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoCircle}>
          <Image
            source={{ uri: 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/ads/tfk_logo.png' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textGroup}>
          <Text style={styles.title}>Thirsty for Knowledge</Text>
          <Text style={styles.subtitle}>Bar Trivia · 30+ venues in Lancaster</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Weekly Schedule + Leaderboard</Text>
          </View>
        </View>

        <Animated.View style={[styles.arrow, {
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
        }]}>
          <Ionicons name="chevron-forward" size={22} color={TFK_GOLD} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles(() => ({
  banner: {
    marginHorizontal: spacing.md,
    backgroundColor: TFK_NAVY,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.5)',
    padding: spacing.md,
    paddingHorizontal: spacing.md + 4,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bgBulb: {
    position: 'absolute' as const,
    right: -8,
    top: -10,
    fontSize: 72,
    opacity: 0.07,
    transform: [{ rotate: '15deg' }],
  },
  content: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden' as const,
    borderWidth: 1.5,
    borderColor: TFK_PURPLE,
  },
  logoImage: {
    width: 33,
    height: 33,
    borderRadius: 16,
  },
  textGroup: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '900' as const,
    color: TFK_GOLD,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: TFK_GOLD_DIM,
    fontWeight: '500' as const,
  },
  pill: {
    alignSelf: 'flex-start' as const,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  pillText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: TFK_GOLD_DIM,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(124,58,237,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
}));
