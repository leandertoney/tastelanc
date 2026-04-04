import { View, ViewStyle } from 'react-native';
import { getColors } from '../config/theme';

interface Props {
  totalSteps: number;
  currentStep: number;
  style?: ViewStyle;
}

export default function OnboardingProgressBar({ totalSteps, currentStep, style }: Props) {
  const colors = getColors();

  return (
    <View style={[{ flexDirection: 'row', gap: 4 }, style]}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        let opacity: number;
        if (index < currentStep) {
          opacity = 1;
        } else if (index === currentStep) {
          opacity = 0.7;
        } else {
          opacity = 0.2;
        }
        return (
          <View
            key={index}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: colors.accent,
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}
