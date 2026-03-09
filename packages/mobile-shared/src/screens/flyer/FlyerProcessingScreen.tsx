import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import { extractFromFlyer } from '../../lib/flyer';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { spacing, radius, typography } from '../../constants/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FlyerProcessing'>;
type Route = RouteProp<RootStackParamList, 'FlyerProcessing'>;

const STEPS = ['Uploading flyer...', 'Analyzing image...', 'Extracting event details...'];

export default function FlyerProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { imageUri } = route.params;
  const styles = useStyles();
  const colors = getColors();

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasFetched = useRef(false);

  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const runExtraction = async () => {
    setError(null);
    setCurrentStep(0);
    hasFetched.current = true;

    try {
      // Simulate step progression
      const stepTimer1 = setTimeout(() => setCurrentStep(1), 1500);
      const stepTimer2 = setTimeout(() => setCurrentStep(2), 4000);

      const result = await extractFromFlyer(imageUri);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      navigation.replace('FlyerPreview', {
        flyerImageUrl: result.flyer_image_url,
        extracted: result.extracted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract event data';
      setError(message);
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      runExtraction();
    }
  }, []);

  // Pulse animation for the step text
  useEffect(() => {
    opacity.value = withTiming(0.5, { duration: 800 }, () => {
      opacity.value = withTiming(1, { duration: 800 });
    });
  }, [currentStep]);

  const handleRetry = () => {
    setIsRetrying(true);
    hasFetched.current = false;
    runExtraction();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          {!error && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
        </View>

        <View style={styles.statusSection}>
          {error ? (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                disabled={isRetrying}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Animated.Text style={[styles.stepText, animatedStyle]}>
                {STEPS[currentStep]}
              </Animated.Text>
              <View style={styles.dots}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i <= currentStep && styles.dotActive]}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  imageContainer: {
    flex: 1,
    maxHeight: '60%' as any,
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  statusSection: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.xl,
  },
  stepText: {
    fontSize: typography.headline,
    color: colors.text,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  dots: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceBorder,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  errorText: {
    fontSize: typography.callout,
    color: colors.error,
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  retryButtonText: {
    fontSize: typography.callout,
    fontWeight: '600' as const,
    color: colors.text,
  },
}));
