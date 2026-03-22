import { View, Text, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { useOtherCities } from '../hooks/useOtherCities';

const ACCENT_OPACITY = 'rgba(255, 255, 255, 0.08)';

function openUrl(url: string) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function getInstagramUrl(handle: string): string {
  const username = handle.startsWith('@') ? handle.slice(1) : handle;
  return `https://www.instagram.com/${username}/`;
}

function getStoreUrl(city: { app_store_url: string; play_store_url: string }): string {
  if (Platform.OS === 'android' && city.play_store_url) return city.play_store_url;
  return city.app_store_url;
}

/**
 * Shown on the Profile tab. Displays sister Taste apps for markets that have
 * an active Instagram account connected. Fully automatic — no code changes
 * needed when new markets go live.
 */
export default function OtherCitiesSection() {
  const styles = useStyles();
  const colors = getColors();
  const { marketId } = useMarket();
  const { cities, isLoading } = useOtherCities(marketId);

  if (isLoading || cities.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="map-outline" size={18} color={colors.accent} style={styles.headerIcon} />
        <Text style={styles.sectionTitle}>Taste in Other Cities</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Traveling? Discover the local scene wherever you go.
      </Text>

      {/* Horizontal scroll of city cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cities.map((city) => (
          <View key={city.id} style={styles.card}>
            {/* City name */}
            <Text style={styles.cityName}>{city.name}</Text>

            {/* Instagram row */}
            {city.instagram_handle ? (
              <TouchableOpacity
                style={styles.socialRow}
                onPress={() => openUrl(getInstagramUrl(city.instagram_handle))}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-instagram" size={15} color={colors.accent} />
                <Text style={styles.socialHandle}>{city.instagram_handle}</Text>
                <Ionicons name="open-outline" size={12} color={colors.textMuted} style={styles.externalIcon} />
              </TouchableOpacity>
            ) : null}

            {/* Download button */}
            {getStoreUrl(city) ? (
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => openUrl(getStoreUrl(city))}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={Platform.OS === 'android' ? 'logo-google-playstore' : 'logo-apple'}
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.downloadBtnText}>
                  {Platform.OS === 'android' ? 'Get on Google Play' : 'Download on App Store'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  headerIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  card: {
    width: 190,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
  },
  socialRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: ACCENT_OPACITY,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
  },
  socialHandle: {
    flex: 1,
    fontSize: 13,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  externalIcon: {
    opacity: 0.6,
  },
  downloadBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 8,
    gap: 6,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.primary,
  },
}));
