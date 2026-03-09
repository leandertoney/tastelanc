import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Dimensions, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsRestoring, type QueryClient } from '@tanstack/react-query';
import { getSupabase, getBrand, getColors, getAssets } from '../config/theme';
import { prefetchHomeScreenData } from '../lib/prefetch';

interface SplashVideoScreenProps {
  onComplete: () => void;
  queryClient: QueryClient;
}

const MIN_SPLASH_DURATION = 2800; // Video length in ms
const MAX_SPLASH_TIMEOUT = 8000; // Never show splash longer than 8s

export default function SplashVideoScreen({ onComplete, queryClient }: SplashVideoScreenProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const hasCompleted = useRef(false);
  const [prefetchComplete, setPrefetchComplete] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const isRestoring = useIsRestoring(); // Wait for cache hydration from AsyncStorage

  const assets = getAssets();
  const colors = getColors();
  const brand = getBrand();
  const videoSource = assets.splashVideo;

  const player = useVideoPlayer(videoSource ?? null, player => {
    if (player) {
      player.loop = false;
      player.muted = true;
      player.play();
    }
  });

  // Start prefetching immediately -- resolve market ID first so cache is scoped
  useEffect(() => {
    const supabase = getSupabase();
    const marketSlug = brand.marketSlug;

    const runPrefetch = async () => {
      try {
        // Resolve full market object and user session in parallel
        const [sessionResult, marketResult] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from('markets')
            .select('*')
            .eq('slug', marketSlug)
            .eq('is_active', true)
            .limit(1)
            .single(),
        ]);

        const userId = sessionResult.data?.session?.user?.id ?? null;
        const marketId = marketResult.data?.id ?? null;

        // Seed market into React Query cache so MarketProvider finds it instantly
        if (marketResult.data) {
          queryClient.setQueryData(['market', marketSlug], marketResult.data);
        }

        await prefetchHomeScreenData(queryClient, userId, marketId);
      } catch (error) {
        console.error('[Splash] Prefetch error:', error);
        // Continue anyway - components will fetch data themselves
      }
      setPrefetchComplete(true);
    };

    runPrefetch();
  }, [brand, queryClient]);

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
    <Animated.View style={[styles.container, { backgroundColor: colors.primaryDark }, { opacity }]}>
      {videoSource ? (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
