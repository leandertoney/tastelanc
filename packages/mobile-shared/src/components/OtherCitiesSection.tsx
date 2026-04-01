import { View, Text, ScrollView, TouchableOpacity, Linking, Platform, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { useOtherCities } from '../hooks/useOtherCities';

const MARKET_DISPLAY_NAMES: Record<string, string> = {
  'lancaster-pa':    'Lancaster, PA',
  'cumberland-pa':   'Cumberland County, PA',
  'fayetteville-nc': 'Fayetteville, NC',
  'ocean-city-md':   'Ocean City, MD',
};

function openUrl(url: string) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
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
        <Ionicons name="map-outline" size={15} color={colors.accent} />
        <Text style={styles.sectionTitle}>Traveling soon?</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Find your move in other cities with our sister apps.
      </Text>

      {/* Horizontal scroll of city cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cities.map((city) => {
          const displayName = MARKET_DISPLAY_NAMES[city.slug] ?? city.name;
          const instagramUrl = city.instagram_handle
            ? `https://www.instagram.com/${city.instagram_handle.replace('@', '')}/`
            : null;
          const storeUrl = getStoreUrl(city);

          return (
            <ImageBackground
              key={city.id}
              source={city.logo_url ? { uri: city.logo_url } : undefined}
              style={styles.card}
              imageStyle={styles.cardImage}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.82)']}
                style={styles.cardOverlay}
              >
                <Text style={styles.cityName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{displayName}</Text>
                {instagramUrl ? (
                  <TouchableOpacity
                    style={styles.igBtn}
                    onPress={() => openUrl(instagramUrl)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-instagram" size={14} color="#fff" />
                    <Text style={styles.igText}>Instagram</Text>
                  </TouchableOpacity>
                ) : null}
                {storeUrl ? (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => openUrl(storeUrl)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={Platform.OS === 'android' ? 'logo-google-playstore' : 'logo-apple'}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </TouchableOpacity>
                ) : null}
              </LinearGradient>
            </ImageBackground>
          );
        })}
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
    gap: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  card: {
    width: 155,
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBgElevated,
  },
  cardImage: {
    borderRadius: radius.md,
  },
  cardOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 32,
    paddingBottom: 10,
    paddingHorizontal: 10,
    gap: 7,
  },
  cityName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  igBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.xs,
    paddingVertical: 9,
  },
  igText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600' as const,
  },
  downloadBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    paddingVertical: 9,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.primary,
  },
}));
