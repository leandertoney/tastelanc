import { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getColors, getBrand, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../types/config';
import { radius, typography } from '../constants/spacing';
import { useNavigationActions } from '../context/NavigationActionsContext';
import { useAuth } from '../hooks/useAuth';
import { useSalesRole } from '../hooks/useSalesRole';
import { useUnreadCount } from '../hooks/useSalesInbox';
import type { RootStackParamList } from '../navigation/types';
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

const LOCATION_KEY = '@tastelanc_location';

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
  const styles = useStyles();
  const colors = getColors();

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
  const styles = useStyles();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const supabase = getSupabase();
  const navigation = useNavigation<NavigationProp>();
  const { restartOnboarding } = useNavigationActions();
  const { userId, user, isAnonymous } = useAuth();
  const { isSalesRep } = useSalesRole();
  const { data: unreadData } = useUnreadCount();

  const { themeMode, setThemeMode, availableModes } = useTheme();

  const [notificationPermission, setNotificationPermission] = useState<string>('undetermined');
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [isTestingVisit, setIsTestingVisit] = useState(false);
  const [isSeedingData, setIsSeedingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const appSlug = brand.marketSlug === 'lancaster-pa' ? 'tastelanc' : brand.marketSlug === 'cumberland-pa' ? 'taste-cumberland' : 'taste-fayetteville';

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationPermission(status);
      } catch {
        setNotificationPermission('undetermined');
      }
    };
    checkPermission();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationEnabled(status === 'granted');
    } catch {}
  };

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationEnabled(status === 'granted');
      try { await AsyncStorage.setItem(LOCATION_KEY, (status === 'granted').toString()); } catch {}
    } else {
      setLocationEnabled(false);
      try { await AsyncStorage.setItem(LOCATION_KEY, 'false'); } catch {}
    }
  };

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
        'Demo Data Seeded!',
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

  const handleDeleteAccount = () => {
    if (isAnonymous || !userId) {
      Alert.alert('Not Signed In', 'You must be signed in to delete an account.');
      return;
    }
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? All your data — check-ins, votes, rewards, and preferences — will be erased. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              `Type your email to confirm deletion.\n\nThis will permanently delete your ${brand.appName} account.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeletingAccount(true);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const token = sessionData?.session?.access_token;
                      if (!token) throw new Error('Not authenticated');

                      const supabaseUrl = (supabase as any).supabaseUrl as string;
                      const response = await fetch(
                        `${supabaseUrl}/functions/v1/delete-account`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );

                      const result = await response.json();
                      if (!response.ok || result.error) {
                        throw new Error(result.error || 'Deletion failed');
                      }

                      // Sign out locally after successful deletion
                      await supabase.auth.signOut();
                    } catch (err: any) {
                      setIsDeletingAccount(false);
                      Alert.alert(
                        'Deletion Failed',
                        `Could not delete your account: ${err?.message || 'Unknown error'}. Please contact ${brand.supportEmail} for assistance.`
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sales Dashboard - only visible for sales reps / admins */}
        {isSalesRep && (
          <>
            <SectionHeader title="Sales" />
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate('SalesDashboard')}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, styles.iconContainerSales]}>
                    <Ionicons name="briefcase" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Sales Dashboard</Text>
                    <Text style={styles.settingSubtitle}>Inbox, leads & CRM</Text>
                  </View>
                </View>
                <View style={styles.salesBadgeRow}>
                  {(unreadData?.count ?? 0) > 0 && (
                    <View style={styles.salesBadge}>
                      <Text style={styles.salesBadgeText}>{unreadData!.count}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Appearance Section */}
        <SectionHeader title="Appearance" />
        <View style={styles.section}>
          <View style={styles.appearanceRow}>
            {(availableModes.filter(m => m !== 'system') as ThemeMode[]).map((mode) => {
              const isActive = themeMode === mode;
              const label = mode === 'dark' ? 'Dark' : mode === 'dim' ? 'Dim' : 'Light';
              const icon = mode === 'dark' ? 'moon' : mode === 'dim' ? 'contrast' : 'sunny';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.themePill, isActive && styles.themePillActive]}
                  onPress={() => setThemeMode(mode)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon as any}
                    size={16}
                    color={isActive ? colors.textOnAccent : colors.textMuted}
                    style={styles.themePillIcon}
                  />
                  <Text style={[styles.themePillLabel, isActive && styles.themePillLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.themePill, themeMode === 'system' && styles.themePillActive]}
              onPress={() => setThemeMode('system')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={themeMode === 'system' ? colors.textOnAccent : colors.textMuted}
                style={styles.themePillIcon}
              />
              <Text style={[styles.themePillLabel, themeMode === 'system' && styles.themePillLabelActive]}>
                System
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            label="Push Notifications"
            subtitle={
              notificationPermission === 'granted'
                ? 'Enabled — tap to verify'
                : notificationPermission === 'denied'
                ? 'Blocked — tap to open Settings'
                : 'Not yet enabled — tap to allow'
            }
            onPress={async () => {
              if (notificationPermission === 'denied') {
                Linking.openSettings();
              } else if (notificationPermission === 'granted') {
                try {
                  const { data: sessionData } = await supabase.auth.getSession();
                  const sessionOk = !!sessionData?.session;
                  const token = await registerForPushNotifications();
                  if (token && userId) {
                    const { error: dbError } = await supabase
                      .from('push_tokens')
                      .upsert(
                        {
                          user_id: userId,
                          token,
                          platform: 'ios',
                          app_slug: appSlug,
                          updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'token' }
                      );
                    Alert.alert(
                      dbError ? 'Save Failed' : 'Notifications Active',
                      dbError
                        ? `Error: ${dbError.message}\nCode: ${dbError.code}\nSession: ${sessionOk ? 'valid' : 'EXPIRED'}\n\nUser: ${userId.substring(0, 8)}...\nToken: ${token.substring(0, 25)}...`
                        : `Token registered successfully.\n\nToken: ${token.substring(0, 25)}...`
                    );
                  } else {
                    Alert.alert(
                      'Registration Issue',
                      `Could not get push token.\nSession: ${sessionOk ? 'valid' : 'EXPIRED'}\n\nUser ID: ${userId ? userId.substring(0, 8) + '...' : 'none'}\nToken: ${token || 'none'}`
                    );
                  }
                } catch (error) {
                  Alert.alert('Error', `Registration failed: ${error}`);
                }
              } else {
                const { status } = await Notifications.requestPermissionsAsync();
                setNotificationPermission(status);
                if (status === 'granted' && userId) {
                  const token = await registerForPushNotifications();
                  if (token) await savePushToken(token, userId);
                }
              }
            }}
          />
          <SettingItem
            icon="location-outline"
            label="Location Services"
            subtitle="Enable nearby restaurant discovery"
            hasSwitch
            switchValue={locationEnabled}
            onSwitchChange={handleLocationToggle}
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
            onPress={() => Linking.openURL(`mailto:${brand.supportEmail}?subject=${brand.appName} Support`)}
          />
          <SettingItem
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL(brand.privacyUrl)}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL(brand.termsUrl)}
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
          {!isAnonymous && (
            <TouchableOpacity
              style={[styles.settingItem, { opacity: isDeletingAccount ? 0.5 : 1 }]}
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, styles.iconContainerDanger]}>
                  {isDeletingAccount ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Ionicons name="person-remove-outline" size={20} color={colors.error} />
                  )}
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, styles.settingLabelDanger]}>
                    {isDeletingAccount ? 'Deleting Account…' : 'Delete Account'}
                  </Text>
                  <Text style={styles.settingSubtitle}>Permanently erase all your data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
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
          <Text style={styles.versionText}>{`${brand.appName} v${Updates.runtimeVersion || '?'}`}</Text>
          <Text style={styles.versionSubtext}>{brand.tagline}</Text>
          <Text style={styles.versionSubtext}>
            {Updates.updateId ? `OTA: ${Updates.updateId.slice(0, 8)}` : 'Embedded bundle'}
            {Updates.channel ? ` · ${Updates.channel}` : ''}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600' as const, color: colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.cardBg,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  settingLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1 },
  iconContainer: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center' as const, alignItems: 'center' as const, marginRight: 14,
  },
  iconContainerDanger: { backgroundColor: `${colors.error}20` },
  iconContainerSales: { backgroundColor: `${colors.accent}20` },
  iconContainerDev: { backgroundColor: '#10B98120' },
  salesBadgeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  salesBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  salesBadgeText: { fontSize: 11, fontWeight: '700' as const, color: colors.text },
  settingTextContainer: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '500' as const, color: colors.text },
  settingLabelDanger: { color: colors.error },
  settingSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  versionContainer: { alignItems: 'center' as const, paddingVertical: 32 },
  versionText: { fontSize: 14, color: colors.textMuted },
  versionSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  devNote: { paddingHorizontal: 20, paddingVertical: 8 },
  devNoteText: { fontSize: 11, color: colors.textSecondary, fontFamily: 'monospace' },
  appearanceRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBgElevated,
    gap: 5,
  },
  themePillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  themePillIcon: {},
  themePillLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
  themePillLabelActive: {
    color: colors.textOnAccent,
  },
}));
