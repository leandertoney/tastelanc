import { View, StyleSheet } from 'react-native';

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  horizontal?: boolean;
}

const sizes = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export default function Spacer({ size = 'md', horizontal = false }: SpacerProps) {
  const dimension = sizes[size];

  return (
    <View
      style={[
        horizontal ? { width: dimension } : { height: dimension },
        styles.spacer,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  spacer: {
    flexShrink: 0,
  },
});
