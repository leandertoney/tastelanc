import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Dimensions, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsRestoring } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { prefetchHomeScreenData } from '../lib/prefetch';

interface SplashVideoScreenProps {
  onComplete: () => void;
}

const videoSource = require('../../assets/animation/tastelanc_dark_spin.mp4');
const MIN_SPLASH_DURATION = 2800; // Video length in ms

export default function SplashVideoScreen({ onComplete }: SplashVideoScreenProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [prefetchComplete, setPrefetchComplete] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const isRestoring = useIsRestoring(); // Wait for cache hydration from AsyncStorage

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false;
    player.muted = true;
    player.play();
  });

  // Start prefetching immediately
  useEffect(() => {
    const runPrefetch = async () => {
      try {
        // Get userId from existing session (if any)
        const { data: { session } } = await supabase.auth.getSession();
        await prefetchHomeScreenData(session?.user?.id ?? null);
      } catch (error) {
        console.error('[Splash] Prefetch error:', error);
        // Continue anyway - components will fetch data themselves
      }
      setPrefetchComplete(true);
    };

    runPrefetch();
  }, []);

  // Track minimum splash duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      setMinTimeElapsed(true);
    }, MIN_SPLASH_DURATION);

    return () => clearTimeout(timeout);
  }, []);

  // Complete when ALL conditions are met: cache hydrated, prefetch done, AND min time elapsed
  useEffect(() => {
    if (!isRestoring && prefetchComplete && minTimeElapsed) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }
  }, [isRestoring, prefetchComplete, minTimeElapsed, onComplete, opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
