import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';

export interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
}

export default function TabBar({ tabs, activeTab, onTabPress }: TabBarProps) {
  const styles = useStyles();
  const colors = getColors();

  // When 4 or fewer tabs, distribute evenly; otherwise scroll
  const evenlySpaced = tabs.length <= 4;

  return (
    <View style={styles.container}>
      {evenlySpaced ? (
        <View style={styles.evenContent}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, styles.tabEven, isActive && styles.tabActive]}
                onPress={() => onTabPress(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => onTabPress(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  evenContent: {
    flexDirection: 'row' as const,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  tabEven: {
    flex: 1,
    alignItems: 'center' as const,
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.textMuted,
  },
  tabTextActive: {
    fontWeight: '700' as const,
    color: colors.accent,
  },
  activeIndicator: {
    marginTop: 4,
    height: 2,
    alignSelf: 'center' as const,
    width: '60%' as unknown as number,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
}));
