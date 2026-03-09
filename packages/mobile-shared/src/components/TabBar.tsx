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

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    position: 'relative' as const,
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
    position: 'absolute' as const,
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
}));
