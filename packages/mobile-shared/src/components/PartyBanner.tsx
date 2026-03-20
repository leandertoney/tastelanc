import { TouchableOpacity, View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TERRACOTTA = '#C84B31';
const TERRACOTTA_DARK = '#A83A22';
const GOLD = '#F0D060';

export default function PartyBanner() {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp>();
  const pulse = useRef(new Animated.Value(1)).current;

  const { data: event } = useQuery({
    queryKey: ['partyActiveEvent'],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('party_events')
        .select('id, name, date, venue')
        .eq('is_active', true)
        .order('date', { ascending: true })
        .limit(1)
        .single();
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  if (!event) return null;

  const eventDate = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => navigation.navigate('PartyRSVP')}
      activeOpacity={0.85}
    >
      {/* Background watermark */}
      <Text style={styles.bgEmoji}>🎉</Text>

      <View style={styles.left}>
        <Animated.Text style={[styles.partyEmoji, { transform: [{ scale: pulse }] }]}>
          🎉
        </Animated.Text>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{event.name}</Text>
          <Text style={styles.subtitle}>{eventDate} · {event.venue} · Industry Only</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>GOT AN INVITE? TAP TO RSVP</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={GOLD} style={styles.arrow} />
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles(() => ({
  banner: {
    marginHorizontal: spacing.md,
    backgroundColor: TERRACOTTA,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.md + 4,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  bgEmoji: {
    position: 'absolute',
    right: -6,
    top: -6,
    fontSize: 64,
    opacity: 0.12,
    transform: [{ rotate: '20deg' }],
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partyEmoji: {
    fontSize: 36,
  },
  textGroup: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(240,208,96,0.75)',
    fontWeight: '500',
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  pillText: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(240,208,96,0.8)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  arrow: {
    marginLeft: spacing.sm,
  },
}));
