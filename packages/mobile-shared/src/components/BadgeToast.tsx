import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Badge } from '../types/retention';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

interface BadgeToastProps {
  badge: Badge | null;
  onDismiss: () => void;
}

export default function BadgeToast({ badge, onDismiss }: BadgeToastProps) {
  const translateY = useRef(new Animated.Value(-90)).current;

  useEffect(() => {
    if (!badge) return;

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -90,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, 3000);

    return () => clearTimeout(timer);
  }, [badge]);

  if (!badge) return null;

  const styles = useStyles();
  const colors = getColors();

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={badge.icon_name as any} size={20} color={colors.textOnAccent} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>Badge Earned!</Text>
        <Text style={styles.name}>{badge.name}</Text>
      </View>
    </Animated.View>
  );
}

const useStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    container: {
      position: 'absolute',
      top: 60,
      alignSelf: 'center',
      zIndex: 999,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: (colors as any).cardBgElevated ?? colors.cardBg,
      borderRadius: radius.full ?? 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      gap: 1,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
  };
});
