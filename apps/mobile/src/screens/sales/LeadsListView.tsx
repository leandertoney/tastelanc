import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../constants/colors';
import type { RootStackParamList } from '../../navigation/types';
import { useSalesLeads } from '../../hooks/useSalesLeads';
import type { Lead } from '../../lib/salesApi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'interested', label: 'Interested' },
  { key: 'converted', label: 'Converted' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  new: '#6B7280',
  contacted: '#3B82F6',
  interested: '#10B981',
  not_interested: '#EF4444',
  converted: '#F59E0B',
};

interface Props {
  search: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function LeadRow({ item, onPress }: { item: Lead; onPress: () => void }) {
  const statusColor = STATUS_COLORS[item.status] || colors.textSecondary;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.businessName} numberOfLines={1}>{item.business_name}</Text>
          {item.has_unread_replies && <View style={styles.unreadDot} />}
        </View>
        {item.contact_name && (
          <Text style={styles.contactName} numberOfLines={1}>{item.contact_name}</Text>
        )}
        <View style={styles.rowBottom}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
          <Text style={styles.lastContacted}>
            {formatDate(item.last_contacted_at)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function StatsRow({ stats }: { stats: { total: number; new: number; contacted: number; interested: number; converted: number } }) {
  const items = [
    { label: 'Total', value: stats.total, color: colors.text },
    { label: 'New', value: stats.new, color: '#6B7280' },
    { label: 'Contacted', value: stats.contacted, color: '#3B82F6' },
    { label: 'Interested', value: stats.interested, color: '#10B981' },
    { label: 'Converted', value: stats.converted, color: '#F59E0B' },
  ];

  return (
    <View style={styles.statsRow}>
      {items.map(item => (
        <View key={item.label} style={styles.statCard}>
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function LeadsListView({ search }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, isError, refetch, isRefetching } = useSalesLeads({
    status: statusFilter,
    search: search || undefined,
  });

  const handlePress = useCallback((item: Lead) => {
    navigation.navigate('LeadDetail', { leadId: item.id });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Lead }) => (
    <LeadRow item={item} onPress={() => handlePress(item)} />
  ), [handlePress]);

  return (
    <View style={styles.container}>
      {/* Stats */}
      {data?.stats && <StatsRow stats={data.stats} />}

      {/* Filter pills */}
      <View style={styles.filters}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, statusFilter === f.key && styles.filterPillActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[styles.filterText, statusFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isError && !data ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorTitle}>Couldn't load leads</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.leads || []}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={
            (data?.leads?.length ?? 0) === 0 ? styles.emptyContainer : undefined
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No leads found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search' : 'Leads will appear here'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: typography.title3,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.caption2,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    fontSize: typography.caption1,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  businessName: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  contactName: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: typography.caption2,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  lastContacted: {
    fontSize: typography.caption2,
    color: colors.textSecondary,
  },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: typography.footnote,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  retryText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.text,
  },
});
