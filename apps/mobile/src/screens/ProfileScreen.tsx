import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigationContext } from '../navigation';
import { colors, radius, spacing, typography } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';
import ProfileStatsRow from '../components/ProfileStatsRow';
import RecentActivityFeed from '../components/RecentActivityFeed';
import {
  simulateGeofenceEntry,
  getTestRestaurants,
  clearTestVisits,
  logRecentVisits,
  seedDemoData,
} from '../lib/radarTestUtils';
import {
  registerForPushNotifications,
  savePushToken,
  scheduleLocalNotification,
} from '../lib/notifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NOTIFICATIONS_KEY = '@tastelanc_notifications';
const LOCATION_KEY = '@tastelanc_location';

// Dynamic title based on check-in count
function getExplorerTitle(checkinCount: number): string {
  if (checkinCount === 0) return 'Lancaster Newcomer';
  if (checkinCount < 5) return 'Lancaster Explorer';
  if (checkinCount < 15) return 'Lancaster Regular';
  if (checkinCount < 30) return 'Local Insider';
  if (checkinCount < 50) return 'Lancaster Expert';
  return 'Local Legend';
}

function useCheckinCount() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['checkinCount', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count || 0;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

interface SettingItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  danger?: boolean;
  subtitle?: string;
}

function SettingItem({
  icon,
  label,
  onPress,
  hasSwitch,
  switchValue,
  onSwitchChange,
  danger,
  subtitle,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={hasSwitch}
      activeOpacity={hasSwitch ? 1 : 0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
          <Ionicons
            name={icon as any}
            size={20}
            color={danger ? colors.error : colors.accent}
          />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>
            {label}
          </Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.cardBgElevated, true: colors.accent }}
          thumbColor={switchValue ? colors.text : colors.textMuted}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { restartOnboarding } = useNavigationContext();
  const { userId } = useAuth();
  const { data: checkinCount = 0 } = useCheckinCount();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [isTestingVisit, setIsTestingVisit] = useState(false);
  const [isSeedingData, setIsSeedingData] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleTestVisit = async () => {
    if (!__DEV__ || !userId) {
      Alert.alert('Error', 'Dev tools require authentication');
      return;
    }
    setIsTestingVisit(true);
    try {
      const restaurants = await getTestRestaurants(10);
      if (restaurants.length === 0) { Alert.alert('Error', 'No restaurants found'); return; }
      const randomRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
      const result = await simulateGeofenceEntry(userId, randomRestaurant.id);
      if (result.success) {
        Alert.alert('Visit Recorded', `Simulated entry at "${randomRestaurant.name}"\n\n${result.message}`);
      } else {
        Alert.alert('Error', result.error || result.message);
      }
    } catch {
      Alert.alert('Error', 'Failed to simulate visit');
    } finally {
      setIsTestingVisit(false);
    }
  };

  const handleViewVisits = async () => {
    if (!__DEV__ || !userId) return;
    await logRecentVisits(userId);
    Alert.alert('Check Console', 'Recent visits logged to console');
  };

  const handleClearTestVisits = async () => {
    if (!__DEV__ || !userId) return;
    Alert.alert('Clear Test Visits', 'Remove all manually recorded visits?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const count = await clearTestVisits(userId);
        Alert.alert('Cleared', `Removed ${count} test visits`);
      }},
    ]);
  };

  const handleSeedDemoData = async () => {
    if (!__DEV__ || !userId) {
      Alert.alert('Error', 'Dev tools require authentication');
      return;
    }
    setIsSeedingData(true);
    try {
      const result = await seedDemoData(userId);
      Alert.alert(
        'Demo Data Seeded! ✅',
        `${result.checkins} check-ins, ${result.votes} votes, ${result.wishlist} wishlist items\n\nPull to refresh screens to see the data.`
      );
    } catch {
      Alert.alert('Error', 'Failed to seed demo data');
    } finally {
      setIsSeedingData(false);
    }
  };

  const handleTestPushNotification = async () => {
    if (!__DEV__) return;
    try {
      const token = await registerForPushNotifications();
      if (token) {
        if (userId) await savePushToken(token, userId);
        await scheduleLocalNotification(
          'Happy Hour Alert!',
          'The Imperial has $5 drafts, $8 wine & 50% off bar menu until 7pm!',
          { screen: 'RestaurantDetail', restaurantId: '28b029d8-171b-4e05-9a2e-628e8e1d6f7d' },
          2
        );
        Alert.alert('Success!', `Token: ${token.substring(0, 25)}...\nNotification in 2s.`);
      } else {
        Alert.alert('No Token', 'Could not get push token. Use a physical device.');
      }
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  const loadPreferences = async () => {
    try {
      const [notifications, location] = await AsyncStorage.multiGet([NOTIFICATIONS_KEY, LOCATION_KEY]);
      if (notifications[1] !== null) setNotificationsEnabled(notifications[1] === 'true');
      if (location[1] !== null) setLocationEnabled(location[1] === 'true');
    } catch {}
  };

  const savePreference = async (key: string, value: boolean) => {
    try { await AsyncStorage.setItem(key, value.toString()); } catch {}
  };

  const explorerTitle = getExplorerTitle(checkinCount);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={colors.text} />
          </View>
          <Text style={styles.headerTitle}>{explorerTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {checkinCount === 0
              ? 'Start exploring Lancaster — check in to earn points'
              : `${checkinCount} restaurant${checkinCount !== 1 ? 's' : ''} visited in Lancaster`}
          </Text>
        </View>

        {/* Stats Row */}
        <ProfileStatsRow
          onVisitsPress={() => navigation.navigate('MyRestaurants')}
          onWishlistPress={() => navigation.navigate('Wishlist')}
        />

        {/* Quick links row */}
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('MyRestaurants')}
          >
            <Ionicons name="location" size={18} color={colors.accent} />
            <Text style={styles.quickLinkText}>My Restaurants</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.quickLinkDivider} />
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <Ionicons name="bookmark" size={18} color={colors.accent} />
            <Text style={styles.quickLinkText}>Bucket List</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <RecentActivityFeed />

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            label="Push Notifications"
            subtitle="Get notified about deals & specials"
            hasSwitch
            switchValue={notificationsEnabled}
            onSwitchChange={(v) => { setNotificationsEnabled(v); savePreference(NOTIFICATIONS_KEY, v); }}
          />
          <SettingItem
            icon="location-outline"
            label="Location Services"
            subtitle="Enable nearby restaurant discovery"
            hasSwitch
            switchValue={locationEnabled}
            onSwitchChange={(v) => { setLocationEnabled(v); savePreference(LOCATION_KEY, v); }}
          />
          <SettingItem
            icon="options-outline"
            label="Dining Preferences"
            subtitle="Update your food preferences"
            onPress={() => Alert.alert('Edit Preferences', 'Would you like to restart onboarding?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Restart', onPress: () => restartOnboarding() },
            ])}
          />
        </View>

        {/* Support Section */}
        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingItem
            icon="bulb-outline"
            label="Suggest a Feature"
            subtitle="Share your ideas with us"
            onPress={() => navigation.navigate('FeatureRequest')}
          />
          <SettingItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => Linking.openURL('mailto:support@tastelanc.com?subject=TasteLanc Support')}
          />
          <SettingItem
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://tastelanc.com/privacy')}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://tastelanc.com/terms')}
          />
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingItem
            icon="trash-outline"
            label="Clear App Data"
            subtitle="Remove all saved data"
            danger
            onPress={() => Alert.alert('Clear App Data', 'This will clear your favorites, check-ins, and preferences. This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear Data', style: 'destructive', onPress: async () => {
                try { await AsyncStorage.clear(); Alert.alert('Success', 'All app data cleared.'); }
                catch { Alert.alert('Error', 'Failed to clear app data.'); }
              }},
            ])}
          />
        </View>

        {/* DEV ONLY */}
        {__DEV__ && (
          <>
            <SectionHeader title="Developer Tools" />
            <View style={styles.section}>
              <TouchableOpacity style={styles.settingItem} onPress={handleTestVisit} disabled={isTestingVisit}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, styles.iconContainerDev]}>
                    <Ionicons name="location" size={20} color="#10B981" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Simulate Geofence Visit</Text>
                    <Text style={styles.settingSubtitle}>Record a test visit to random restaurant</Text>
                  </View>
                </View>
                {isTestingVisit ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
              </TouchableOpacity>
              <SettingItem icon="list-outline" label="Log Recent Visits" subtitle="Print visits to console" onPress={handleViewVisits} />
              <SettingItem icon="close-circle-outline" label="Clear Test Visits" subtitle="Remove manually recorded visits" onPress={handleClearTestVisits} danger />
              <SettingItem icon="notifications-outline" label="Test Push Notification" subtitle="Register token & send local notification" onPress={handleTestPushNotification} />
              <TouchableOpacity style={styles.settingItem} onPress={handleSeedDemoData} disabled={isSeedingData}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, styles.iconContainerDev]}>
                    <Ionicons name="flask-outline" size={20} color="#10B981" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Seed Demo Data</Text>
                    <Text style={styles.settingSubtitle}>Populate visits, votes & wishlist for testing</Text>
                  </View>
                </View>
                {isSeedingData ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
              </TouchableOpacity>
            </View>
            <View style={styles.devNote}>
              <Text style={styles.devNoteText}>User ID: {userId ? `${userId.slice(0, 8)}...` : 'Not authenticated'}</Text>
            </View>
          </>
        )}

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>TasteLanc v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with love in Lancaster, PA</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: { fontSize: typography.title2, fontWeight: '700', color: colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: typography.footnote, color: colors.textMuted, textAlign: 'center' },
  quickLinks: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm + 4,
    gap: spacing.xs + 2,
  },
  quickLinkText: { flex: 1, fontSize: typography.footnote, fontWeight: '600', color: colors.text },
  quickLinkDivider: { width: 1, backgroundColor: colors.border },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.cardBg,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  iconContainerDanger: { backgroundColor: `${colors.error}20` },
  iconContainerDev: { backgroundColor: '#10B98120' },
  settingTextContainer: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  settingLabelDanger: { color: colors.error },
  settingSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  versionContainer: { alignItems: 'center', paddingVertical: 32 },
  versionText: { fontSize: 14, color: colors.textMuted },
  versionSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  devNote: { paddingHorizontal: 20, paddingVertical: 8 },
  devNoteText: { fontSize: 11, color: colors.textSecondary, fontFamily: 'monospace' },
});
