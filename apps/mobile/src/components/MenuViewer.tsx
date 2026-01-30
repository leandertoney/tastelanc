import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/colors';
import type { Menu, MenuSection, MenuItem, DietaryFlag } from '../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MenuViewerProps {
  menuUrl: string | null;
  restaurantName: string;
  menus?: Menu[];
  loading?: boolean;
}

// Dietary flag display config
const DIETARY_FLAG_CONFIG: Record<DietaryFlag, { label: string; icon: string; color: string }> = {
  'vegetarian': { label: 'V', icon: 'leaf', color: '#22c55e' },
  'vegan': { label: 'VG', icon: 'leaf', color: '#16a34a' },
  'gluten-free': { label: 'GF', icon: 'restaurant', color: '#f59e0b' },
  'dairy-free': { label: 'DF', icon: 'water', color: '#3b82f6' },
  'nut-free': { label: 'NF', icon: 'alert-circle', color: '#8b5cf6' },
  'spicy': { label: '🌶', icon: 'flame', color: '#ef4444' },
};

function DietaryBadge({ flag }: { flag: DietaryFlag }) {
  const config = DIETARY_FLAG_CONFIG[flag];
  if (!config) return null;

  return (
    <View style={[styles.dietaryBadge, { backgroundColor: config.color + '20' }]}>
      <Text style={[styles.dietaryBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  if (!item.is_available) return null;

  return (
    <View style={styles.menuItem}>
      <View style={styles.menuItemHeader}>
        <View style={styles.menuItemNameRow}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={10} color={colors.accent} />
            </View>
          )}
        </View>
        <View style={styles.menuItemPrice}>
          {item.price !== null ? (
            <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
          ) : item.price_description ? (
            <Text style={styles.priceDescription}>{item.price_description}</Text>
          ) : null}
        </View>
      </View>
      {item.description && (
        <Text style={styles.menuItemDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      {item.dietary_flags && item.dietary_flags.length > 0 && (
        <View style={styles.dietaryFlags}>
          {item.dietary_flags.map((flag) => (
            <DietaryBadge key={flag} flag={flag} />
          ))}
        </View>
      )}
    </View>
  );
}

function SectionPage({ section }: { section: MenuSection }) {
  const availableItems = section.menu_items.filter((item) => item.is_available);

  return (
    <ScrollView
      style={styles.sectionPage}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.sectionPageContent}
    >
      {section.description && (
        <Text style={styles.sectionPageDescription}>{section.description}</Text>
      )}
      {availableItems
        .sort((a, b) => a.display_order - b.display_order)
        .map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

function SwipeableMenuView({ menu }: { menu: Menu }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const sections = menu.menu_sections
    .filter((s) => s.menu_items.some((item) => item.is_available))
    .sort((a, b) => a.display_order - b.display_order);

  if (sections.length === 0) {
    return (
      <View style={styles.placeholderContainer}>
        <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>No items available</Text>
      </View>
    );
  }

  // If only one section, just show it without tabs
  if (sections.length === 1) {
    return <SectionPage section={sections[0]} />;
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < sections.length) {
      setActiveIndex(index);
    }
  };

  const handleTabPress = (index: number) => {
    setActiveIndex(index);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  return (
    <View style={styles.swipeableContainer}>
      {/* Section Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {sections.map((section, index) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.sectionTab,
                activeIndex === index && styles.sectionTabActive,
              ]}
              onPress={() => handleTabPress(index)}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeIndex === index && styles.sectionTabTextActive,
                ]}
                numberOfLines={1}
              >
                {section.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Swipeable Pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        bounces={false}
        style={styles.pagesContainer}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {sections.map((section) => (
          <View key={section.id} style={[styles.pageWrapper, { width: SCREEN_WIDTH }]}>
            <SectionPage section={section} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function StructuredMenuView({ menus }: { menus: Menu[] }) {
  const [activeMenuIndex, setActiveMenuIndex] = useState(0);
  const menuScrollRef = useRef<ScrollView>(null);

  const activeMenus = menus
    .filter((menu) => menu.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  if (activeMenus.length === 0) {
    return (
      <View style={styles.placeholderContainer}>
        <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>Menu coming soon</Text>
        <Text style={styles.placeholderSubtext}>Check back later for the full menu</Text>
      </View>
    );
  }

  // If only one menu, just show its sections
  if (activeMenus.length === 1) {
    return <SwipeableMenuView menu={activeMenus[0]} />;
  }

  // Multiple menus - show menu selector at top
  const handleMenuScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeMenuIndex && index >= 0 && index < activeMenus.length) {
      setActiveMenuIndex(index);
    }
  };

  const handleMenuTabPress = (index: number) => {
    setActiveMenuIndex(index);
    menuScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  return (
    <View style={styles.multiMenuContainer}>
      {/* Menu Selector Tabs */}
      <View style={styles.menuTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuTabsContainer}
        >
          {activeMenus.map((menu, index) => (
            <TouchableOpacity
              key={menu.id}
              style={[
                styles.menuTab,
                activeMenuIndex === index && styles.menuTabActive,
              ]}
              onPress={() => handleMenuTabPress(index)}
            >
              <Text
                style={[
                  styles.menuTabText,
                  activeMenuIndex === index && styles.menuTabTextActive,
                ]}
                numberOfLines={1}
              >
                {menu.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Menu Pages */}
      <ScrollView
        ref={menuScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMenuScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        bounces={false}
        style={styles.menuPagesContainer}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {activeMenus.map((menu) => (
          <View key={menu.id} style={[styles.menuPageWrapper, { width: SCREEN_WIDTH }]}>
            <SwipeableMenuView menu={menu} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function MenuViewer({ menuUrl, restaurantName, menus, loading }: MenuViewerProps) {
  const [webLoading, setWebLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleOpenExternal = () => {
    if (menuUrl) {
      Linking.openURL(menuUrl);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  // If we have structured menu data, display it natively
  if (menus && menus.length > 0) {
    return <StructuredMenuView menus={menus} />;
  }

  // No menu URL provided and no structured data
  if (!menuUrl) {
    return (
      <View style={styles.placeholderContainer}>
        <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>Menu coming soon</Text>
        <Text style={styles.placeholderSubtext}>
          Check back later for the full menu
        </Text>
      </View>
    );
  }

  // Check if URL is a PDF (WebView handles PDFs differently on platforms)
  const isPdf = menuUrl.toLowerCase().endsWith('.pdf');

  // For PDFs on iOS/Android, offer to open externally
  if (isPdf && Platform.OS !== 'web') {
    return (
      <View style={styles.pdfContainer}>
        <Ionicons name="document-text-outline" size={48} color={colors.accent} />
        <Text style={styles.pdfTitle}>PDF Menu Available</Text>
        <Text style={styles.pdfSubtext}>
          Tap below to view {restaurantName}'s menu
        </Text>
        <TouchableOpacity style={styles.openButton} onPress={handleOpenExternal}>
          <Ionicons name="open-outline" size={20} color={colors.text} />
          <Text style={styles.openButtonText}>Open Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with external link option */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity style={styles.externalButton} onPress={handleOpenExternal}>
          <Ionicons name="open-outline" size={18} color={colors.accent} />
          <Text style={styles.externalText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.webviewContainer}>
        {webLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Loading menu...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color={colors.error} />
            <Text style={styles.errorText}>Unable to load menu</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setError(false)}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.openButton} onPress={handleOpenExternal}>
              <Text style={styles.openButtonText}>Open in Browser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            source={{ uri: menuUrl }}
            style={styles.webview}
            onLoadStart={() => setWebLoading(true)}
            onLoadEnd={() => setWebLoading(false)}
            onError={() => {
              setWebLoading(false);
              setError(true);
            }}
            startInLoadingState
            scalesPageToFit
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  // Swipeable menu styles
  swipeableContainer: {
    flex: 1,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 8,
  },
  sectionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cardBgElevated,
    marginRight: 8,
  },
  sectionTabActive: {
    backgroundColor: colors.accent,
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  sectionTabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  pagesContainer: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  sectionPage: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sectionPageContent: {
    paddingTop: 8,
  },
  sectionPageDescription: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  // Multi-menu styles
  multiMenuContainer: {
    flex: 1,
  },
  menuTabsWrapper: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  menuTabsContainer: {
    paddingHorizontal: 4,
    paddingVertical: 12,
    gap: 12,
  },
  menuTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.sm,
    marginRight: 8,
  },
  menuTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  menuTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
  },
  menuTabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  menuPagesContainer: {
    flex: 1,
  },
  menuPageWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  // Menu item styles
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flexShrink: 1,
  },
  featuredBadge: {
    backgroundColor: colors.accent + '20',
    borderRadius: 10,
    padding: 4,
    marginLeft: 6,
  },
  menuItemPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  priceDescription: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  menuItemDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  dietaryFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  dietaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dietaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 24,
  },
  // WebView and other styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  externalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  externalText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  webviewContainer: {
    flex: 1,
    minHeight: 350,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.cardBgElevated,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  retryText: {
    color: colors.accent,
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  pdfContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  pdfSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.full,
    marginTop: 12,
  },
  openButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
