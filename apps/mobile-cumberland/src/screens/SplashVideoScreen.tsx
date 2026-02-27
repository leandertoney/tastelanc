import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Dimensions, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsRestoring } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { prefetchHomeScreenData } from '../lib/prefetch';
import { MARKET_SLUG } from '../config/market';
import { colors } from '../constants/colors';

interface SplashVideoScreenProps {
  onComplete: () => void;
}

const videoSource = require('../../assets/animation/logo_spin.mp4');
const MIN_SPLASH_DURATION = 2800; // Video length in ms
const MAX_SPLASH_TIMEOUT = 8000; // Never show splash longer than 8s

export default function SplashVideoScreen({ onComplete }: SplashVideoScreenProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const hasCompleted = useRef(false);
  const [prefetchComplete, setPrefetchComplete] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const isRestoring = useIsRestoring(); // Wait for cache hydration from AsyncStorage

  const player = useVideoPlayer(videoSource, player => {
    player.loop = false;
    player.muted = true;
    player.play();
  });

  // Start prefetching immediately — resolve market ID first so cache is scoped
  useEffect(() => {
    const runPrefetch = async () => {
      try {
        // Resolve full market object and user session in parallel
        const [sessionResult, marketResult] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from('markets')
            .select('*')
            .eq('slug', MARKET_SLUG)
            .eq('is_active', true)
            .limit(1)
            .single(),
        ]);

        const userId = sessionResult.data?.session?.user?.id ?? null;
        const marketId = marketResult.data?.id ?? null;

        // Seed market into React Query cache so MarketProvider finds it instantly
        if (marketResult.data) {
          queryClient.setQueryData(['market', MARKET_SLUG], marketResult.data);
        }

        await prefetchHomeScreenData(userId, marketId);
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

  // Force complete after absolute max timeout (safety net)
  // Prevents splash from staying forever if prefetch hangs or isRestoring gets stuck
  useEffect(() => {
    const forceTimeout = setTimeout(() => {
      if (!hasCompleted.current) {
        console.warn('[Splash] Force completing after max timeout');
        hasCompleted.current = true;
        onComplete();
      }
    }, MAX_SPLASH_TIMEOUT);

    return () => clearTimeout(forceTimeout);
  }, [onComplete]);

  // Complete when ALL conditions are met: cache hydrated, prefetch done, AND min time elapsed
  useEffect(() => {
    if (!isRestoring && prefetchComplete && minTimeElapsed && !hasCompleted.current) {
      hasCompleted.current = true;
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
    backgroundColor: '#FEF6E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
