import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useIsOpen } from '../hooks/useOpenStatus';
import { colors } from '../constants/colors';

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
          isOpen ? styles.dotOpen : styles.dotClosed,
        ]}
      />
      <Text
        style={[
          isSmall ? styles.textSmall : styles.textDefault,
          isOpen ? styles.textOpen : styles.textClosed,
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
  dotOpen: {
    backgroundColor: colors.success,
  },
  dotClosed: {
    backgroundColor: colors.error,
  },
  textSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  textDefault: {
    fontSize: 13,
    fontWeight: '600',
  },
  textOpen: {
    color: colors.success,
  },
  textClosed: {
    color: colors.error,
  },
});
