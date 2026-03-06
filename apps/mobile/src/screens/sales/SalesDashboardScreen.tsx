import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../constants/colors';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadCount } from '../../hooks/useSalesInbox';
import InboxListView from './InboxListView';
import LeadsListView from './LeadsListView';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Tab = 'inbox' | 'leads';

export default function SalesDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [search, setSearch] = useState('');
  const { data: unreadData } = useUnreadCount();

  const handleCompose = useCallback(() => {
    navigation.navigate('ComposeEmail', {});
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales</Text>
          <TouchableOpacity onPress={handleCompose} style={styles.composeButton}>
            <Ionicons name="create-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'inbox' && styles.segmentActive]}
            onPress={() => setActiveTab('inbox')}
          >
            <Text style={[styles.segmentText, activeTab === 'inbox' && styles.segmentTextActive]}>
              Inbox
            </Text>
            {(unreadData?.count ?? 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadData!.count}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'leads' && styles.segmentActive]}
            onPress={() => setActiveTab('leads')}
          >
            <Text style={[styles.segmentText, activeTab === 'leads' && styles.segmentTextActive]}>
              Leads
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'inbox' ? 'Search conversations...' : 'Search leads...'}
            placeholderTextColor={colors.inputPlaceholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'inbox' ? (
        <InboxListView search={search} />
      ) : (
        <LeadsListView search={search} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: typography.title3,
    fontWeight: '700',
    color: colors.text,
  },
  composeButton: {
    padding: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    padding: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm - 2,
    gap: 6,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.subhead,
    color: colors.text,
    padding: 0,
  },
});
