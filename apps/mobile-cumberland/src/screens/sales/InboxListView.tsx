import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../constants/colors';
import type { RootStackParamList } from '../../navigation/types';
import { useSalesInbox } from '../../hooks/useSalesInbox';
import { bulkAction } from '../../lib/salesApi';
import type { Conversation } from '../../lib/salesApi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  search: string;
}

const FILTERS = ['all', 'unread'] as const;
type Filter = typeof FILTERS[number];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ConversationRow({
  item,
  onPress,
  isSelected,
  onToggle,
}: {
  item: Conversation;
  onPress: () => void;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const isUnread = item.unread_count > 0;

  return (
    <View style={[styles.row, isSelected && styles.rowSelected]}>
      {/* Always-visible checkbox */}
      <TouchableOpacity style={styles.checkbox} onPress={onToggle} activeOpacity={0.6}>
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={22}
          color={isSelected ? colors.accent : colors.textMuted}
        />
      </TouchableOpacity>

      {/* Tappable content area */}
      <TouchableOpacity style={styles.rowTappable} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, isUnread && styles.nameUnread]} numberOfLines={1}>
              {item.counterparty_name || item.counterparty_email}
            </Text>
            <Text style={styles.time}>{formatTime(item.last_message_at)}</Text>
          </View>
          {item.lead_business_name && (
            <Text style={styles.business} numberOfLines={1}>
              {item.lead_business_name}
            </Text>
          )}
          <View style={styles.rowBottom}>
            <Text style={[styles.snippet, isUnread && styles.snippetUnread]} numberOfLines={1}>
              {item.last_message_direction === 'sent' && (
                <Text style={styles.youPrefix}>You: </Text>
              )}
              {item.last_message_snippet || item.last_message_subject || 'No content'}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

type InboxType = 'crm' | 'info';

export default function InboxListView({ search }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const [filter, setFilter] = useState<Filter>('all');
  const [inbox, setInbox] = useState<InboxType>('crm');

  // Selection state
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isBulkActioning, setIsBulkActioning] = useState(false);

  const hasSelection = selectedEmails.size > 0;

  const { data, isLoading, isError, refetch, isRefetching } = useSalesInbox({
    search: search || undefined,
    filter,
    inbox,
  });

  const conversations = data?.conversations || [];
  const isAdmin = data?.isAdmin ?? false;
  const isAllSelected = conversations.length > 0 && selectedEmails.size === conversations.length;

  const toggleSelect = useCallback((email: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(conversations.map(c => c.counterparty_email)));
    }
  }, [isAllSelected, conversations]);

  const clearSelection = useCallback(() => setSelectedEmails(new Set()), []);

  const handleBulkAction = useCallback(async (action: 'mark_read' | 'mark_unread' | 'delete') => {
    if (selectedEmails.size === 0) return;

    const perform = async () => {
      setIsBulkActioning(true);
      try {
        await bulkAction({
          action,
          emails: Array.from(selectedEmails),
          inbox,
        });
        clearSelection();
        refetch();
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Operation failed');
      } finally {
        setIsBulkActioning(false);
      }
    };

    if (action === 'delete') {
      Alert.alert(
        'Delete Conversations',
        `Delete ${selectedEmails.size} conversation${selectedEmails.size !== 1 ? 's' : ''}? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: perform },
        ]
      );
    } else {
      perform();
    }
  }, [selectedEmails, inbox, clearSelection, refetch]);

  const handlePress = useCallback((item: Conversation) => {
    navigation.navigate('EmailThread', {
      counterpartyEmail: item.counterparty_email,
      counterpartyName: item.counterparty_name || undefined,
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <ConversationRow
      item={item}
      onPress={() => handlePress(item)}
      isSelected={selectedEmails.has(item.counterparty_email)}
      onToggle={() => toggleSelect(item.counterparty_email)}
    />
  ), [handlePress, selectedEmails, toggleSelect]);

  return (
    <View style={styles.container}>
      {/* Admin inbox switcher */}
      {isAdmin && (
        <View style={styles.inboxSwitcher}>
          {(['crm', 'info'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.inboxTab, inbox === type && styles.inboxTabActive]}
              onPress={() => { setInbox(type); clearSelection(); }}
            >
              <Ionicons
                name={type === 'crm' ? 'briefcase-outline' : 'information-circle-outline'}
                size={16}
                color={inbox === type ? colors.text : colors.textMuted}
              />
              <Text style={[styles.inboxTabText, inbox === type && styles.inboxTabTextActive]}>
                {type === 'crm' ? 'CRM' : 'Info@'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filter pills + bulk actions row */}
      <View style={styles.toolbarRow}>
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : 'Unread'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
            <Ionicons
              name={isAllSelected ? 'checkbox' : 'checkbox-outline'}
              size={18}
              color={isAllSelected ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.selectAllText, isAllSelected && { color: colors.accent }]}>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bulk action bar — shown when items are selected */}
        {hasSelection && (
          <View style={styles.bulkBar}>
            <Text style={styles.selectionCount}>{selectedEmails.size} selected</Text>
            {isBulkActioning ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <View style={styles.bulkActions}>
                <TouchableOpacity
                  onPress={() => handleBulkAction('mark_read')}
                  style={styles.toolbarBtn}
                >
                  <Ionicons name="mail-open-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBulkAction('mark_unread')}
                  style={styles.toolbarBtn}
                >
                  <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBulkAction('delete')}
                  style={styles.toolbarBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={clearSelection} style={styles.toolbarBtn}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {isLoading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isError && !data ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorTitle}>Couldn't load inbox</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={item => item.counterparty_email}
          extraData={selectedEmails}
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyContainer : undefined
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No conversations</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'unread' ? 'No unread messages' : 'Send your first email to get started'}
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
  inboxSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  inboxTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inboxTabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  inboxTabText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.textMuted,
  },
  inboxTabTextActive: {
    color: colors.textOnAccent,
  },
  // Toolbar row
  toolbarRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: typography.caption1,
    fontWeight: '600',
    color: colors.textMuted,
  },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionCount: {
    fontSize: typography.footnote,
    fontWeight: '600',
    color: colors.text,
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  toolbarBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    fontSize: typography.footnote,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.textOnAccent,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowSelected: {
    backgroundColor: `${colors.accent}15`,
  },
  rowTappable: {
    flex: 1,
  },
  checkbox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: typography.subhead,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontWeight: '700',
  },
  time: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
  },
  business: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginBottom: 2,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snippet: {
    fontSize: typography.footnote,
    color: colors.textSecondary,
    flex: 1,
  },
  snippetUnread: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  youPrefix: {
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginLeft: 8,
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
    textAlign: 'center',
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
    color: colors.textOnAccent,
  },
});
