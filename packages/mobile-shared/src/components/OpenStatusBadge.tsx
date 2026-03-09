import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useIsOpen } from '../hooks/useOpenStatus';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';

interface OpenStatusBadgeProps {
  restaurantId: string;
  size?: 'small' | 'default';
  style?: ViewStyle;
}

export default function OpenStatusBadge({ restaurantId, size = 'small', style }: OpenStatusBadgeProps) {
  const isOpen = useIsOpen(restaurantId);
  const styles = useStyles();
  const colors = getColors();

  // No hours data — render nothing
  if (isOpen === null) return null;

  const isSmall = size === 'small';

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.dot,
          isSmall ? styles.dotSmall : styles.dotDefault,
          isOpen
            ? { backgroundColor: colors.success }
            : { backgroundColor: colors.error },
        ]}
      />
      <Text
        style={[
          isSmall ? styles.textSmall : styles.textDefault,
          isOpen
            ? { color: colors.success }
            : { color: colors.error },
        ]}
      >
        {isOpen ? 'Open' : 'Closed'}
      </Text>
    </View>
  );
}

const useStyles = createLazyStyles((_colors) => ({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    fontWeight: '600' as const,
  },
  textDefault: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
}));
