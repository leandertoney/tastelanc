import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/colors';
import {
  getVibeEmoji,
  getBestForEmoji,
  formatTagLabel,
  getNoiseIcon,
  formatNoiseLevel,
} from '../lib/formatters';

interface AtAGlanceCardProps {
  vibeTags: string[] | null;
  bestFor: string[] | null;
  noiseLevel: string | null;
  parkingInfo: string | null;
}

export default function AtAGlanceCard({
  vibeTags,
  bestFor,
  noiseLevel,
  parkingInfo,
}: AtAGlanceCardProps) {
  const hasVibeTags = vibeTags && vibeTags.length > 0;
  const hasBestFor = bestFor && bestFor.length > 0;
  const hasNoise = noiseLevel && noiseLevel.trim().length > 0;
  const hasParking = parkingInfo && parkingInfo.trim().length > 0;

  // Don't render if no enrichment data at all
  if (!hasVibeTags && !hasBestFor && !hasNoise && !hasParking) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="sparkles-outline" size={18} color={colors.gold} />
        <Text style={styles.headerText}>At a Glance</Text>
      </View>

      {/* The Vibe */}
      {hasVibeTags && (
        <View style={styles.row}>
          <View style={styles.labelRow}>
            <Ionicons name="pulse-outline" size={14} color={colors.gold} />
            <Text style={styles.label}>THE VIBE</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {vibeTags!.slice(0, 6).map((tag) => (
              <View key={tag} style={styles.vibeChip}>
                <Text style={styles.vibeChipText}>
                  {getVibeEmoji(tag)} {formatTagLabel(tag)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Best For */}
      {hasBestFor && (
        <View style={[styles.row, hasVibeTags && styles.rowBorder]}>
          <View style={styles.labelRow}>
            <Ionicons name="people-outline" size={14} color={colors.info} />
            <Text style={styles.label}>BEST FOR</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {bestFor!.slice(0, 4).map((value) => (
              <View key={value} style={styles.bestForChip}>
                <Text style={styles.bestForChipText}>
                  {getBestForEmoji(value)} {formatTagLabel(value)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Details (noise + parking) */}
      {(hasNoise || hasParking) && (
        <View
          style={[
            styles.row,
            (hasVibeTags || hasBestFor) && styles.rowBorder,
          ]}
        >
          <View style={styles.detailsRow}>
            {hasNoise && (
              <View style={styles.detailPill}>
                <Ionicons
                  name={getNoiseIcon(noiseLevel!) as any}
                  size={14}
                  color={colors.textMuted}
                />
                <Text style={styles.detailText}>
                  {formatNoiseLevel(noiseLevel!)}
                </Text>
              </View>
            )}
            {hasParking && (
              <View style={styles.detailPill}>
                <Ionicons
                  name="car-outline"
                  size={14}
                  color={colors.textMuted}
                />
                <Text style={styles.detailText}>{parkingInfo}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.goldBorder,
  },
  headerText: {
    fontSize: typography.headline,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    paddingVertical: spacing.sm + 4,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.caption1,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  vibeChip: {
    backgroundColor: colors.goldLight,
    borderColor: colors.goldBorder,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  vibeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gold,
  },
  bestForChip: {
    backgroundColor: 'rgba(10, 132, 255, 0.10)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bestForChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.info,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
