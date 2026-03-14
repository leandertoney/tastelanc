import { View, Text } from 'react-native';
import { getColors } from '../config/theme';

/**
 * Custom tab bar label for "the Move" tab.
 * Renders a tiny italic "the" stacked above "Move" for a branded feel.
 */
export default function TheMoveTabLabel({ focused, color }: { focused: boolean; color: string }) {
  const colors = getColors();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 13 }}>
      <Text
        style={{
          fontSize: 7,
          fontStyle: 'italic',
          color: colors.accent,
          lineHeight: 8,
          letterSpacing: 0.3,
          opacity: 0.7,
          position: 'absolute',
          top: -4,
          left: -4,
        }}
      >
        the
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color,
          lineHeight: 13,
        }}
      >
        Move
      </Text>
    </View>
  );
}

/**
 * Custom header title for the Move screen nav bar.
 * Same "the Move" styling as the tab label, scaled up for the header.
 */
export function TheMoveHeaderTitle() {
  const colors = getColors();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 24 }}>
      <Text
        style={{
          fontSize: 11,
          fontStyle: 'italic',
          color: colors.textMuted,
          lineHeight: 12,
          letterSpacing: 0.3,
          position: 'absolute',
          top: -2,
          left: -6,
        }}
      >
        the
      </Text>
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: colors.text,
          lineHeight: 22,
        }}
      >
        Move
      </Text>
    </View>
  );
}
