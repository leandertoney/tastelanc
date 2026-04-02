/**
 * TFKEntertainmentCard — Fixed-position entertainment card for Thirsty for Knowledge Trivia.
 * Renders at position 0 in EntertainmentSection, Lancaster-only.
 * Matches EntertainmentCard dimensions (140×140).
 *
 * Logo approximation: teal circle bg, golden beer glass, pink brain, navy text banner.
 * Will be swapped for their real PNG logo asset when provided.
 */

import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { ENTERTAINMENT_CARD_SIZE } from './EntertainmentCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// TFK brand colors extracted from their logo
const TFK_TEAL      = '#2A7A8C';
const TFK_TEAL_DARK = '#1E5F6E';
const TFK_GOLD      = '#E8A520';
const TFK_GOLD_LT   = '#F5C842';
const TFK_NAVY      = '#1A2B52';

export default function TFKEntertainmentCard() {
  const navigation = useNavigation<NavigationProp>();
  const brand = getBrand();
  const styles = useStyles();

  // Beer rocks ±12° twice on mount, then stays still
  const rock = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Short delay so the card finishes rendering before animating
    const timeout = setTimeout(() => {
      Animated.sequence([
        Animated.timing(rock, { toValue:  1, duration: 180, useNativeDriver: true }),
        Animated.timing(rock, { toValue: -1, duration: 360, useNativeDriver: true }),
        Animated.timing(rock, { toValue:  1, duration: 360, useNativeDriver: true }),
        Animated.timing(rock, { toValue: -1, duration: 360, useNativeDriver: true }),
        Animated.timing(rock, { toValue:  0, duration: 220, useNativeDriver: true }),
      ]).start();
    }, 600);
    return () => clearTimeout(timeout);
  }, [rock]);

  const glassRotate = rock.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  if (brand.marketSlug !== 'lancaster-pa') return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ThirstyKnowledge')}
      activeOpacity={0.88}
    >
      {/* Teal circle background */}
      <View style={styles.circle}>

        {/* Beer glass — rocks on mount */}
        <Animated.View style={[styles.glassWrap, { transform: [{ rotate: glassRotate }] }]}>
          {/* Glass top / foam */}
          <View style={styles.glassFoam} />
          {/* Glass body */}
          <View style={styles.glassBody}>
            {/* Brain emoji centered in beer */}
            <Text style={styles.brainEmoji}>🧠</Text>
          </View>
          {/* Glass base */}
          <View style={styles.glassBase} />
        </Animated.View>

        {/* Dark navy text banner overlaid across the lower glass */}
        <View style={styles.banner}>
          <Text style={styles.bannerTop}>Thirsty</Text>
          <Text style={styles.bannerMid}>for</Text>
          <Text style={styles.bannerBot}>Knowledge</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CARD = ENTERTAINMENT_CARD_SIZE; // 140

const useStyles = createLazyStyles(() => ({
  card: {
    width: CARD,
    height: CARD,
    marginRight: spacing.md,
    borderRadius: CARD / 2,
    overflow: 'hidden' as const,
    shadowColor: TFK_TEAL_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  circle: {
    width: CARD,
    height: CARD,
    borderRadius: CARD / 2,
    backgroundColor: TFK_TEAL,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  glassWrap: {
    alignItems: 'center' as const,
    position: 'absolute' as const,
    top: 12,
  },
  glassFoam: {
    width: 54,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  glassBody: {
    width: 50,
    height: 52,
    backgroundColor: TFK_GOLD,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  glassBase: {
    width: 32,
    height: 7,
    backgroundColor: TFK_GOLD_LT,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  brainEmoji: {
    fontSize: 26,
    lineHeight: 30,
    marginTop: 4,
  },
  banner: {
    position: 'absolute' as const,
    bottom: 14,
    left: 0,
    right: 0,
    backgroundColor: TFK_NAVY,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    transform: [{ rotate: '-4deg' }, { scaleX: 1.08 }],
  },
  bannerTop: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 16,
    fontStyle: 'italic' as const,
  },
  bannerMid: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: TFK_GOLD_LT,
    lineHeight: 11,
    fontStyle: 'italic' as const,
  },
  bannerBot: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 15,
    fontStyle: 'italic' as const,
  },
}));
