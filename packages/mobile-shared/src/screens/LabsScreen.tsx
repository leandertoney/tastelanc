import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useLabFeatures, useVoteLabFeature } from '../hooks/useLabFeatures';
import { useAuth } from '../hooks/useAuth';
import type { LabFeatureWithVotes } from '../types/retention';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

function LabFeatureCard({ feature }: { feature: LabFeatureWithVotes }) {
  const styles = useStyles();
  const colors = getColors();
  const { userId, isAnonymous } = useAuth();
  const voteMutation = useVoteLabFeature();

  const handleVote = (vote: 1 | -1) => {
    if (!userId || isAnonymous) return;
    voteMutation.mutate({ featureId: feature.id, vote });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name={feature.icon_name as any} size={22} color={colors.accent} />
        </View>
        <View style={styles.cardTitles}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      </View>

      {isAnonymous ? (
        <Text style={styles.signInPrompt}>Sign in to vote on features</Text>
      ) : (
        <View style={styles.voteRow}>
          <TouchableOpacity
            style={[styles.voteBtn, feature.userVote === 1 && styles.voteBtnActive]}
            onPress={() => handleVote(1)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="thumbs-up"
              size={16}
              color={feature.userVote === 1 ? colors.textOnAccent : colors.textSecondary}
            />
            <Text style={[styles.voteCount, feature.userVote === 1 && styles.voteCountActive]}>
              {feature.upvotes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteBtn, feature.userVote === -1 && styles.voteBtnDown]}
            onPress={() => handleVote(-1)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="thumbs-down"
              size={16}
              color={feature.userVote === -1 ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.voteCount, feature.userVote === -1 && styles.voteCountActive]}>
              {feature.downvotes}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function LabsScreen() {
  const navigation = useNavigation();
  const styles = useStyles();
  const colors = getColors();
  const { data: features, isLoading } = useLabFeatures();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Labs</Text>
          <Text style={styles.headerSubtitle}>Vote on features you want to see next</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {(features ?? []).map((f) => (
            <LabFeatureCard key={f.id} feature={f} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    list: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitles: {
      flex: 1,
      gap: 3,
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    featureDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    voteRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    voteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full ?? 999,
      backgroundColor: (colors as any).cardBgElevated ?? `${colors.text}10`,
    },
    voteBtnActive: {
      backgroundColor: colors.accent,
    },
    voteBtnDown: {
      backgroundColor: '#E63946',
    },
    voteCount: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    voteCountActive: {
      color: '#fff',
    },
    signInPrompt: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
});
