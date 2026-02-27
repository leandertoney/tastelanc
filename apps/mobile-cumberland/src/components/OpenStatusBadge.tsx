import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useIsOpen } from '../hooks/useOpenStatus';

// Bright overlay-safe colors (Cumberland's theme success/error are too dark for dark overlays)
const OPEN_COLOR = '#34C759';
const CLOSED_COLOR = '#FF453A';

interface OpenStatusBadgeProps {
  restaurantId: string;
  size?: 'small' | 'default';
  style?: ViewStyle;
}

export default function OpenStatusBadge({ restaurantId, size = 'small', style }: OpenStatusBadgeProps) {
  const isOpen = useIsOpen(restaurantId);

  // No hours data — render nothing
  if (isOpen === null) return null;

  const isSmall = size === 'small';

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.dot,
          isSmall ? styles.dotSmall : styles.dotDefault,
          { backgroundColor: isOpen ? OPEN_COLOR : CLOSED_COLOR },
        ]}
      />
      <Text
        style={[
          isSmall ? styles.textSmall : styles.textDefault,
          { color: isOpen ? OPEN_COLOR : CLOSED_COLOR },
        ]}
      >
        {isOpen ? 'Open' : 'Closed'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    borderRadius: 99,
  },
  dotSmall: {
    width: 6,
    height: 6,
    marginRight: 4,
  },
  dotDefault: {
    width: 8,
    height: 8,
    marginRight: 6,
  },
  textSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  textDefault: {
    fontSize: 13,
    fontWeight: '600',
  },
});
