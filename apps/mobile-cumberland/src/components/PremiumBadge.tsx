import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { PremiumTier } from '../types/database';

interface PremiumBadgeProps {
  tier: PremiumTier;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const TIER_CONFIG = {
  basic: {
    colors: ['#607D8B', '#455A64'] as const,
    icon: 'star' as const,
    label: 'Partner',
  },
  premium: {
    colors: ['#FFD700', '#FFA000'] as const,
    icon: 'star' as const,
    label: 'Premium',
  },
  elite: {
    colors: ['#9C27B0', '#6A1B9A'] as const,
    icon: 'diamond' as const,
    label: 'Elite',
  },
};

const SIZE_CONFIG = {
  small: {
    containerPadding: 4,
    iconSize: 10,
    fontSize: 9,
    borderRadius: 6,
    gap: 2,
  },
  medium: {
    containerPadding: 6,
    iconSize: 12,
    fontSize: 10,
    borderRadius: 8,
    gap: 3,
  },
  large: {
    containerPadding: 8,
    iconSize: 16,
    fontSize: 12,
    borderRadius: 10,
    gap: 4,
  },
};

export default function PremiumBadge({
  tier,
  size = 'medium',
  showLabel = true,
}: PremiumBadgeProps) {
  const tierConfig = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <LinearGradient
      colors={[...tierConfig.colors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          paddingHorizontal: sizeConfig.containerPadding + 2,
          paddingVertical: sizeConfig.containerPadding,
          borderRadius: sizeConfig.borderRadius,
          gap: sizeConfig.gap,
        },
      ]}
    >
      <Ionicons
        name={tierConfig.icon}
        size={sizeConfig.iconSize}
        color="#FFF"
      />
      {showLabel && (
        <Text
          style={[
            styles.label,
            { fontSize: sizeConfig.fontSize },
          ]}
        >
          {tierConfig.label}
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    color: '#FFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
