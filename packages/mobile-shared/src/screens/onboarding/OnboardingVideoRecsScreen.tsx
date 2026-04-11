import { useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import FeatureDemoScreen from '../../components/FeatureDemoScreen';
import { trackScreenView } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingVideoRecs'>;

const { width: SW, height: SH } = Dimensions.get('window');
const PHONE_WIDTH = SW * 0.62;
const PHONE_HEIGHT = SH * 0.52;

const VIDEO = {
  restaurant: 'Cabbage Hill Schnitzel Haus',
  user: '@leander',
  caption: "Best German soda I\u2019ve ever had!",
  tag: 'Amazing Service',
  video: 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/recommendation-videos/d1b931ce-66ca-40c1-8144-cabf146e006b/7eb1ab76be3a.mp4',
  likes: 12,
  comments: 3,
};

const SIDE_ICONS = [
  { icon: 'heart', count: String(VIDEO.likes), color: '#FF6B6B' },
  { icon: 'chatbubble', count: String(VIDEO.comments), color: '#FFFFFF' },
  { icon: 'share-social', count: '', color: '#FFFFFF' },
];

export default function OnboardingVideoRecsScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();

  const player = useVideoPlayer(VIDEO.video, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Phone frame entrance
  const phoneOpacity = useSharedValue(0);
  const phoneScale = useSharedValue(0.88);

  // Side buttons
  const sideButtons = [0, 1, 2].map(() => ({
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
  }));

  useEffect(() => {
    trackScreenView('OnboardingStep_VideoRecs');

    // Phone scales in
    phoneOpacity.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    phoneScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 75 }));

    // Side buttons
    sideButtons.forEach((btn, i) => {
      const delay = 700 + i * 120;
      btn.opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
      btn.scale.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 150 }));
    });
  }, []);

  const phoneStyle = useAnimatedStyle(() => ({
    opacity: phoneOpacity.value,
    transform: [{ scale: phoneScale.value }],
  }));

  const sideStyles = sideButtons.map(b => useAnimatedStyle(() => ({
    opacity: b.opacity.value,
    transform: [{ scale: b.scale.value }],
  })));

  return (
    <FeatureDemoScreen
      headline="Watch. Discover. Go."
      subheadline={`Real people, real recs.\nVideo reviews from locals who know.`}
      gradientColors={[colors.primary, '#0a0a14', colors.primary]}
      progressStep={6}
      totalProgressSteps={12}
      onContinue={() => navigation.navigate('OnboardingRewards')}
    >
      {/* Phone frame */}
      <Animated.View style={[styles.phoneFrame, phoneStyle]}>
        {/* Notch */}
        <View style={styles.notch} />

        {/* Video viewport */}
        <View style={styles.videoViewport}>
          <VideoView
            player={player}
            style={styles.videoPlayer}
            contentFit="cover"
            nativeControls={false}
          />
          <View style={styles.videoOverlayDark} />

          {/* Video info overlay */}
          <View style={styles.videoInfo}>
            <Text style={styles.infoUser}>{VIDEO.user}</Text>
            <Text style={[styles.infoRestaurant, { color: colors.accent }]}>{VIDEO.restaurant}</Text>
            <Text style={styles.infoCaption} numberOfLines={2}>{VIDEO.caption}</Text>
            <View style={styles.infoTag}>
              <Text style={styles.infoTagText}>{VIDEO.tag}</Text>
            </View>
          </View>

          {/* Side action buttons */}
          <View style={styles.sideActions}>
            {SIDE_ICONS.map((item, i) => (
              <Animated.View key={i} style={[styles.sideBtn, sideStyles[i]]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
                {item.count ? <Text style={styles.sideBtnCount}>{item.count}</Text> : null}
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Bottom bezel */}
        <View style={styles.bottomBezel}>
          <View style={styles.homeIndicator} />
        </View>
      </Animated.View>
    </FeatureDemoScreen>
  );
}

const useStyles = createLazyStyles((colors) => ({
  phoneFrame: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 32,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  notch: {
    width: 70,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1a1a',
    alignSelf: 'center' as const,
    marginTop: 8,
    zIndex: 10,
  },
  videoViewport: {
    flex: 1,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoOverlayDark: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  videoInfo: {
    position: 'absolute' as const,
    bottom: 16,
    left: 12,
    right: 48,
  },
  infoUser: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  infoRestaurant: {
    fontSize: 15,
    fontWeight: '800' as const,
    marginBottom: 3,
  },
  infoCaption: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 15,
    marginBottom: 5,
  },
  infoTag: {
    alignSelf: 'flex-start' as const,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  infoTagText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  sideActions: {
    position: 'absolute' as const,
    right: 8,
    bottom: 60,
    alignItems: 'center' as const,
    gap: 14,
    zIndex: 5,
  },
  sideBtn: {
    alignItems: 'center' as const,
    gap: 2,
  },
  sideBtnCount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  bottomBezel: {
    height: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#000000',
  },
  homeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
}));
