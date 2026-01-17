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
import { colors, radius } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
import {
  simulateGeofenceEntry,
  getTestRestaurants,
  clearTestVisits,
  logRecentVisits,
} from '../lib/radarTestUtils';
import {
  registerForPushNotifications,
  savePushToken,
  scheduleLocalNotification,
} from '../lib/notifications';

// Storage keys for preferences
const NOTIFICATIONS_KEY = '@tastelanc_notifications';
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

  // Preference states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Dev tools state
  const [isTestingVisit, setIsTestingVisit] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // DEV ONLY: Test Radar visit tracking
  const handleTestVisit = async () => {
    if (!__DEV__ || !userId) {
      Alert.alert('Error', 'Dev tools require authentication');
      return;
    }

    setIsTestingVisit(true);
    try {
      // Get a random restaurant to test with
      const restaurants = await getTestRestaurants(10);
      if (restaurants.length === 0) {
        Alert.alert('Error', 'No restaurants found');
        return;
      }

      // Pick a random one
      const randomRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];

      // Simulate geofence entry
      const result = await simulateGeofenceEntry(userId, randomRestaurant.id);

      if (result.success) {
        Alert.alert(
          'Visit Recorded',
          `Simulated entry at "${randomRestaurant.name}"\n\n${result.message}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to simulate visit');
      console.error(error);
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
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const count = await clearTestVisits(userId);
          Alert.alert('Cleared', `Removed ${count} test visits`);
        },
      },
    ]);
  };

  const handleTestPushNotification = async () => {
    if (!__DEV__) return;

    try {
      // First, try to register and save the push token
      console.log('Registering for push notifications...');
      const token = await registerForPushNotifications();

      if (token) {
        console.log('Push token:', token);

        // Save to database if we have a userId
        if (userId) {
          const saved = await savePushToken(token, userId);
          console.log('Token saved to database:', saved);
        }

        // Send a local test notification
        await scheduleLocalNotification(
          'Happy Hour Alert!',
          'The Imperial has $5 drafts, $8 wine & 50% off bar menu until 7pm!',
          { screen: 'RestaurantDetail', restaurantId: '28b029d8-171b-4e05-9a2e-628e8e1d6f7d' },
          2
        );

        Alert.alert(
          'Success!',
          `Token registered: ${token.substring(0, 25)}...\n\nA test notification will appear in 2 seconds.`
        );
      } else {
        Alert.alert(
          'No Token',
          'Could not get push token. Make sure:\n\n1. You are on a physical device\n2. Notifications are enabled in Settings'
        );
      }
    } catch (error) {
      console.error('Push notification test error:', error);
      Alert.alert('Error', `Failed to test push notifications: ${error}`);
    }
  };

  const loadPreferences = async () => {
    try {
      const [notifications, location] = await AsyncStorage.multiGet([
        NOTIFICATIONS_KEY,
        LOCATION_KEY,
      ]);

      if (notifications[1] !== null) setNotificationsEnabled(notifications[1] === 'true');
      if (location[1] !== null) setLocationEnabled(location[1] === 'true');
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreference = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    savePreference(NOTIFICATIONS_KEY, value);
  };

  const handleLocationToggle = (value: boolean) => {
    setLocationEnabled(value);
    savePreference(LOCATION_KEY, value);
  };

  const handleEditPreferences = () => {
    Alert.alert(
      'Edit Preferences',
      'Would you like to update your dining preferences?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart Onboarding',
          onPress: () => restartOnboarding(),
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear App Data',
      'This will clear your favorites, check-ins, and preferences. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All app data has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear app data.');
            }
          },
        },
      ]
    );
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@tastelanc.com?subject=TasteLanc Support');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://tastelanc.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://tastelanc.com/terms');
  };

  const handleSuggestFeature = () => {
    navigation.navigate('FeatureRequest');
  };

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
          <Text style={styles.headerTitle}>TasteLanc Explorer</Text>
          <Text style={styles.headerSubtitle}>Discovering Lancaster's best spots</Text>
        </View>

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            label="Push Notifications"
            subtitle="Get notified about deals & specials"
            hasSwitch
            switchValue={notificationsEnabled}
            onSwitchChange={handleNotificationsToggle}
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
            onPress={handleEditPreferences}
          />
        </View>

        {/* Support Section */}
        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingItem
            icon="bulb-outline"
            label="Suggest a Feature"
            subtitle="Share your ideas with us"
            onPress={handleSuggestFeature}
          />
          <SettingItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={handleSupport}
          />
          <SettingItem
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={handleTermsOfService}
          />
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingItem
            icon="trash-outline"
            label="Clear App Data"
            subtitle="Remove all saved data"
            onPress={handleClearData}
            danger
          />
        </View>

        {/* DEV ONLY: Developer Tools Section */}
        {__DEV__ && (
          <>
            <SectionHeader title="Developer Tools" />
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleTestVisit}
                disabled={isTestingVisit}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, styles.iconContainerDev]}>
                    <Ionicons name="location" size={20} color="#10B981" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Simulate Geofence Visit</Text>
                    <Text style={styles.settingSubtitle}>Record a test visit to random restaurant</Text>
                  </View>
                </View>
                {isTestingVisit ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              <SettingItem
                icon="list-outline"
                label="Log Recent Visits"
                subtitle="Print visits to console"
                onPress={handleViewVisits}
              />
              <SettingItem
                icon="close-circle-outline"
                label="Clear Test Visits"
                subtitle="Remove manually recorded visits"
                onPress={handleClearTestVisits}
                danger
              />
              <SettingItem
                icon="notifications-outline"
                label="Test Push Notification"
                subtitle="Register token & send local notification"
                onPress={handleTestPushNotification}
              />
            </View>
            <View style={styles.devNote}>
              <Text style={styles.devNoteText}>
                User ID: {userId ? `${userId.slice(0, 8)}...` : 'Not authenticated'}
              </Text>
            </View>
          </>
        )}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>TasteLanc v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with love in Lancaster, PA</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconContainerDanger: {
    backgroundColor: `${colors.error}20`,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  settingLabelDanger: {
    color: colors.error,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  versionSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  iconContainerDev: {
    backgroundColor: '#10B98120',
  },
  devNote: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  devNoteText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});
