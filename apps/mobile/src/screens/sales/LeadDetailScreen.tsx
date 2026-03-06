import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, radius } from '../../constants/colors';
import type { RootStackParamList } from '../../navigation/types';
import { useLeadDetail } from '../../hooks/useSalesLeads';
import { updateLead } from '../../lib/salesApi';
import { queryKeys } from '../../lib/queryClient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LeadDetailRoute = RouteProp<RootStackParamList, 'LeadDetail'>;

const STATUSES = [
  { key: 'new', label: 'New', color: '#6B7280' },
  { key: 'contacted', label: 'Contacted', color: '#3B82F6' },
  { key: 'interested', label: 'Interested', color: '#10B981' },
  { key: 'not_interested', label: 'Not Interested', color: '#EF4444' },
  { key: 'converted', label: 'Converted', color: '#F59E0B' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const ACTIVITY_ICONS: Record<string, string> = {
  email: 'mail-outline',
  email_reply: 'mail-open-outline',
  call: 'call-outline',
  note: 'document-text-outline',
  status_change: 'swap-horizontal-outline',
};

export default function LeadDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LeadDetailRoute>();
  const { leadId } = route.params;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useLeadDetail(leadId);

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateLead(leadId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.leadDetail(leadId) });
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads'] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleStatusChange = useCallback(() => {
    const currentStatus = data?.lead?.status;
    const options = STATUSES.filter(s => s.key !== currentStatus);

    Alert.alert(
      'Change Status',
      `Current: ${currentStatus?.replace('_', ' ')}`,
      [
        ...options.map(s => ({
          text: s.label,
          onPress: () => statusMutation.mutate(s.key),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }, [data?.lead?.status, statusMutation]);

  const handleEmail = useCallback(() => {
    if (!data?.lead?.email) return;
    navigation.navigate('ComposeEmail', {
      recipientEmail: data.lead.email,
      recipientName: data.lead.contact_name || data.lead.business_name,
    });
  }, [data?.lead, navigation]);

  const handleCall = useCallback(() => {
    if (!data?.lead?.phone) return;
    Linking.openURL(`tel:${data.lead.phone}`);
  }, [data?.lead?.phone]);

  if (isLoading || (!data && !isError)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lead</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lead</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorTitle}>Couldn't load lead</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { lead, activities, ownership } = data;
  const statusInfo = STATUSES.find(s => s.key === lead.status);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{lead.business_name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.businessName}>{lead.business_name}</Text>
          {lead.contact_name && (
            <Text style={styles.contactName}>{lead.contact_name}</Text>
          )}

          {/* Status */}
          <TouchableOpacity style={styles.statusRow} onPress={handleStatusChange}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusInfo?.color || colors.textSecondary}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo?.color || colors.textSecondary }]} />
              <Text style={[styles.statusText, { color: statusInfo?.color }]}>
                {lead.status.replace('_', ' ')}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Contact Info */}
          <View style={styles.infoRows}>
            {lead.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{lead.email}</Text>
              </View>
            )}
            {lead.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{lead.phone}</Text>
              </View>
            )}
            {lead.website && (
              <View style={styles.infoRow}>
                <Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>{lead.website}</Text>
              </View>
            )}
            {lead.city && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{lead.city}, {lead.state || 'PA'}</Text>
              </View>
            )}
          </View>

          {ownership.isLocked && (
            <View style={styles.lockedBanner}>
              <Ionicons name="lock-closed" size={14} color={colors.warning} />
              <Text style={styles.lockedText}>
                Owned by {lead.assigned_to_name || 'another rep'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, !lead.email && styles.actionDisabled]}
            onPress={handleEmail}
            disabled={!lead.email}
          >
            <Ionicons name="mail" size={20} color={lead.email ? colors.accent : colors.textSecondary} />
            <Text style={[styles.actionLabel, !lead.email && styles.actionLabelDisabled]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, !lead.phone && styles.actionDisabled]}
            onPress={handleCall}
            disabled={!lead.phone}
          >
            <Ionicons name="call" size={20} color={lead.phone ? colors.success : colors.textSecondary} />
            <Text style={[styles.actionLabel, !lead.phone && styles.actionLabelDisabled]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, statusMutation.isPending && styles.actionDisabled]}
            onPress={handleStatusChange}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Ionicons name="swap-horizontal" size={20} color={colors.info} />
            )}
            <Text style={styles.actionLabel}>Status</Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        {lead.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{lead.notes}</Text>
          </View>
        )}

        {/* Activity Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {activities.length === 0 ? (
            <Text style={styles.noActivity}>No activity yet</Text>
          ) : (
            activities.map((activity, index) => (
              <View key={activity.id} style={[styles.activityItem, index < activities.length - 1 && styles.activityBorder]}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={(ACTIVITY_ICONS[activity.activity_type] || 'ellipse-outline') as any}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityDesc}>{activity.description}</Text>
                  <Text style={styles.activityTime}>{formatDateTime(activity.created_at)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Meta */}
        <View style={styles.meta}>
          <Text style={styles.metaText}>Created {formatDate(lead.created_at)}</Text>
          {lead.assigned_to_name && (
            <Text style={styles.metaText}>Assigned to {lead.assigned_to_name}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  businessName: {
    fontSize: typography.title3,
    fontWeight: '700',
    color: colors.text,
  },
  contactName: {
    fontSize: typography.subhead,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm + 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: {
    fontSize: typography.footnote,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  infoRows: { marginTop: spacing.md, gap: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: typography.subhead,
    color: colors.text,
    flex: 1,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: `${colors.warning}15`,
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  lockedText: {
    fontSize: typography.footnote,
    color: colors.warning,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionDisabled: { opacity: 0.4 },
  actionLabel: {
    fontSize: typography.caption1,
    fontWeight: '600',
    color: colors.text,
  },
  actionLabelDisabled: { color: colors.textSecondary },
  sectionTitle: {
    fontSize: typography.subhead,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm + 4,
  },
  notesText: {
    fontSize: typography.subhead,
    color: colors.textMuted,
    lineHeight: 22,
  },
  noActivity: {
    fontSize: typography.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 10,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  activityContent: { flex: 1 },
  activityDesc: {
    fontSize: typography.footnote,
    color: colors.text,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: typography.caption2,
    color: colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  metaText: {
    fontSize: typography.caption1,
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
