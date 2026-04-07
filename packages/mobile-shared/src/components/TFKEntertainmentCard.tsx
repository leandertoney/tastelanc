/**
 * TFKEntertainmentCard — Fixed-position entertainment card for Thirsty for Knowledge Trivia.
 * Renders at position 0 in EntertainmentSection, Lancaster-only.
 * Matches EntertainmentCard dimensions (140×140).
 */

import { useRef, useEffect } from 'react';
import { TouchableOpacity, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { ENTERTAINMENT_CARD_SIZE } from './EntertainmentCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TFK_LOGO_URL = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/ads/tfk_logo.png';

export default function TFKEntertainmentCard() {
  const navigation = useNavigation<NavigationProp>();
  const brand = getBrand();
  const styles = useStyles();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  if (brand.marketSlug !== 'lancaster-pa') return null;

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ThirstyKnowledge')}
        activeOpacity={0.88}
      >
        <LinearGradient
          colors={['#F9A8D4', '#C084FC', '#93C5FD']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        >
          <Image
            source={{ uri: TFK_LOGO_URL }}
            style={styles.logo}
            resizeMode="contain"
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const CARD = ENTERTAINMENT_CARD_SIZE; // 140

const useStyles = createLazyStyles(() => ({
  card: {
    width: CARD,
    height: CARD,
    marginRight: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  gradient: {
    width: CARD,
    height: CARD,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  logo: {
    width: CARD - 12,
    height: CARD - 12,
  },
}));
