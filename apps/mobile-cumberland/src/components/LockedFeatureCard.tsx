import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/colors';

interface LockedFeatureCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  isLocked: boolean;
  comingSoon?: boolean;
  onPress: () => void;
}

export default function LockedFeatureCard({
  title,
  description,
  icon,
  isLocked,
  comingSoon,
  onPress,
}: LockedFeatureCardProps) {
  const isDisabled = isLocked || comingSoon;

  return (
    <TouchableOpacity
      style={[styles.card, isDisabled && styles.cardLocked]}
      onPress={onPress}
      activeOpacity={isDisabled ? 0.6 : 0.8}
      disabled={comingSoon}
    >
      <View style={[styles.iconContainer, isDisabled && styles.iconContainerLocked]}>
        <Ionicons
          name={icon}
          size={28}
          color={isDisabled ? colors.textSecondary : colors.accent}
        />
      </View>

      <Text style={[styles.title, isDisabled && styles.titleLocked]}>{title}</Text>
      <Text style={[styles.description, isDisabled && styles.descriptionLocked]}>
        {description}
      </Text>

      {comingSoon && (
        <View style={styles.lockOverlay}>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 150;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  cardLocked: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainerLocked: {
    backgroundColor: `${colors.textSecondary}15`,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  titleLocked: {
    color: colors.textSecondary,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  descriptionLocked: {
    color: colors.textSecondary,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  comingSoonBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
