import { View, Text } from 'react-native';
import { getColors } from '../config/theme';

/**
 * Custom tab bar label for "the Move" tab.
 * Renders a tiny italic "the" stacked above "Move" for a branded feel.
 *
 * Usage in BottomTabNavigator:
 *   import TheMoveTabLabel from '../components/TheMoveTabLabel';
 *   ...
 *   <Tab.Screen
 *     name="Move"
 *     component={SafeSceneScreen}
 *     options={{
 *       title: 'Move',
 *       tabBarLabel: ({ focused, color }) => <TheMoveTabLabel focused={focused} color={color} />,
 *     }}
 *   />
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
