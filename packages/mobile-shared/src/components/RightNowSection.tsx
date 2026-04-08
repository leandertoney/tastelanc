import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { useRightNow } from '../hooks/useRightNow';
import type { RightNowItem, RightNowItemType } from '../types/retention';
import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TYPE_CONFIG: Record<RightNowItemType, { icon: string; label: string; colorKey: 'accentAlt' | 'accent' }> = {
  happy_hour: { icon: 'beer', label: 'Happy Hour', colorKey: 'accent' },
  event: { icon: 'musical-notes', label: 'Event', colorKey: 'accentAlt' },
  special: { icon: 'pricetag', label: 'Special', colorKey: 'accentAlt' },
};

function RightNowCard({ item }: { item: RightNowItem }) {
  const styles = useStyles();
  const colors = getColors();
  const navigation = useNavigation<NavigationProp>();
  const config = TYPE_CONFIG[item.type];
  const borderColor = colors.accent;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: borderColor }]}
      onPress={() => navigation.navigate('RestaurantDetail', { id: item.restaurantId })}
      activeOpacity={0.7}
    >
      <View style={styles.typePill}>
        <Ionicons name={config.icon as any} size={11} color={colors.accent} />
        <Text style={styles.typeLabel}>{config.label}</Text>
      </View>
      <Text style={styles.restaurantName} numberOfLines={1}>
        {item.restaurantName}
      </Text>
      <Text style={styles.itemName} numberOfLines={1}>
        {item.itemName}
      </Text>
      <Text style={styles.timeWindow}>{item.timeWindow}</Text>
    </TouchableOpacity>
  );
}

export default function RightNowSection() {
  const { data: items = [], isLoading } = useRightNow();

  if (!isLoading && items.length === 0) return null;
  if (isLoading) return <View style={{ height: 0 }} />;

  const keyExtractor = useCallback((item: RightNowItem) => item.id, []);
  const renderItem = useCallback(({ item }: { item: RightNowItem }) => (
    <RightNowCard item={item} />
  ), []);

  return (
    <View>
      <SectionHeader title="Right Now" subtitle="Happening this moment" />
      <Spacer size="sm" />
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
      />
    </View>
  );
}

const useStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    card: {
      width: 210,
      backgroundColor: colors.cardBg,
      borderRadius: radius.md,
      borderLeftWidth: 3,
      padding: spacing.sm,
      gap: 4,
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    typeLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    restaurantName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    itemName: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    timeWindow: {
      fontSize: 11,
      color: colors.accent,
      fontWeight: '600',
    },
  };
});
