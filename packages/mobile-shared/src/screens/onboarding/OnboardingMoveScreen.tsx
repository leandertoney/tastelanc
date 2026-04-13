import { useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { getColors, getBrand } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import FeatureDemoScreen from '../../components/FeatureDemoScreen';
import { trackScreenView } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingMove'>;

const { width: SW } = Dimensions.get('window');

const POSTS = [
  { user: 'Sarah M.', caption: 'The seasonal menu is unreal', tag: 'Must Try', color: '#FF6B6B' },
  { user: 'James T.', caption: 'Rooftop vibes on a Tuesday', tag: 'Hidden Gem', color: '#4ECDC4' },
  { user: 'Olivia K.', caption: 'Best brunch spot in the city', tag: 'Trending', color: '#FFE66D' },
];

export default function OnboardingMoveScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();

  // Posts cascade in like a social feed
  const posts = POSTS.map(() => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(60),
    scale: useSharedValue(0.95),
  }));

  // Compass icon floating
  const compassRotate = useSharedValue(0);
  const compassOpacity = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_Move');

    POSTS.forEach((_, i) => {
      const delay = 350 + i * 200;
      posts[i].opacity.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
      posts[i].translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 85 }));
      posts[i].scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 90 }));
    });

    compassOpacity.value = withDelay(200, withTiming(0.12, { duration: 800 }));
    compassRotate.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1, false
    );
  }, []);

  const postStyles = posts.map(p => useAnimatedStyle(() => ({
    opacity: p.opacity.value,
    transform: [{ translateY: p.translateY.value }, { scale: p.scale.value }],
  })));

  const compassStyle = useAnimatedStyle(() => ({
    opacity: compassOpacity.value,
    transform: [{ rotate: `${compassRotate.value}deg` }],
  }));

  return (
    <FeatureDemoScreen
      headline={`What's the Move?`}
      subheadline={`Your social feed for ${brand.cityName}\nTrending spots, community picks, and real photos`}
      gradientColors={[colors.primary, colors.primary, colors.primary]}
      headlineShadowColor="#F4511E"
      progressStep={5}
      totalProgressSteps={15}
      onContinue={() => navigation.navigate('OnboardingVideoRecs')}
    >
      {/* Floating compass */}
      <Animated.View style={[styles.floatingCompass, compassStyle]}>
        <Ionicons name="compass" size={60} color="#F4511E" />
      </Animated.View>

      {/* Social feed posts */}
      <View style={styles.feed}>
        {POSTS.map((post, i) => (
          <Animated.View key={i} style={[styles.postCard, postStyles[i]]}>
            {/* Color accent bar representing the photo */}
            <View style={[styles.photoBar, { backgroundColor: post.color + '40' }]}>
              <View style={[styles.photoAccent, { backgroundColor: post.color }]} />
            </View>
            <View style={styles.postContent}>
              <View style={styles.postHeader}>
                <Text style={styles.postUser}>{post.user}</Text>
                <View style={[styles.tagBadge, { backgroundColor: post.color + '20' }]}>
                  <Text style={[styles.tagText, { color: post.color }]}>{post.tag}</Text>
                </View>
              </View>
              <Text style={styles.postCaption}>{post.caption}</Text>
              <View style={styles.postActions}>
                <Ionicons name="heart" size={14} color={post.color} />
                <Ionicons name="chatbubble-outline" size={13} color={colors.text} style={{ marginLeft: 12, opacity: 0.4 }} />
                <Ionicons name="share-outline" size={13} color={colors.text} style={{ marginLeft: 12, opacity: 0.4 }} />
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    </FeatureDemoScreen>
  );
}

const useStyles = createLazyStyles((colors) => ({
  floatingCompass: {
    position: 'absolute' as const,
    top: -30,
    right: -5,
  },
  feed: {
    width: '100%',
    gap: 10,
  },
  postCard: {
    flexDirection: 'row' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(15,30,46,0.1)',
    borderLeftWidth: 6,
    borderLeftColor: '#F4511E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  photoBar: {
    width: 0,
    position: 'relative' as const,
  },
  photoAccent: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
  },
  postContent: {
    flex: 1,
    padding: 14,
  },
  postHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  postUser: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  postCaption: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
  },
  postActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
}));
