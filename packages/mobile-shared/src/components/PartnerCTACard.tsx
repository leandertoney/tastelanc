import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { withAlpha } from '../utils/colorUtils';
import { radius, spacing } from '../constants/spacing';

type ContactCategory = 'restaurant' | 'happy_hour' | 'entertainment' | 'event';

interface PartnerCTACardProps {
  icon: keyof typeof Ionicons.glyphMap;
  headline: string;
  subtext: string;
  category: ContactCategory;
  width: number;
  height: number;
  onContactPress?: (category: ContactCategory) => void;
}

export default function PartnerCTACard({
  icon,
  headline,
  subtext,
  category,
  width,
  height,
  onContactPress,
}: PartnerCTACardProps) {
  const styles = useStyles();
  const colors = getColors();

  return (
    <TouchableOpacity
      style={[styles.card, { width, height }]}
      onPress={() => onContactPress?.(category)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[colors.primaryDark, colors.surface, colors.primaryDark]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Accent border effect */}
        <View style={styles.borderOverlay} />

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={40} color={colors.accent} />
          </View>

          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subtext}>{subtext}</Text>

          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>Contact Us</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.text} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export type { ContactCategory };

const useStyles = createLazyStyles((colors) => ({
  card: {
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  borderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg - 1,
    borderWidth: 1,
    borderColor: withAlpha(colors.accent, 0.3),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: withAlpha(colors.accent, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnAccent,
  },
}));
