/**
 * VideoRecommendCaptureScreen — camera screen for recording a video recommendation.
 *
 * Positive framing: "Show us what you love about this place"
 * 30-second max recording with countdown timer.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import { MAX_DURATION_SECONDS } from '../lib/videoRecommendations';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoRecommendCapture'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OVERLAY_FADE_DURATION = 2000;

export default function VideoRecommendCaptureScreen({ route, navigation }: Props) {
  const colors = getColors();
  const styles = useStyles();
  const { restaurantId, restaurantName } = route.params as {
    restaurantId: string;
    restaurantName: string;
  };

  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref to track elapsed time without stale closures
  const elapsedRef = useRef(0);
  const isRecordingRef = useRef(false);

  // Request permissions on mount
  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, [cameraPermission?.granted, micPermission?.granted]);

  // Fade out the encouraging overlay after a few seconds
  useEffect(() => {
    if (showOverlay) {
      const timeout = setTimeout(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(() => setShowOverlay(false));
      }, OVERLAY_FADE_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [showOverlay]);

  // Timer during recording — uses refs to avoid stale closures
  useEffect(() => {
    if (isRecording) {
      elapsedRef.current = 0;
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        const newVal = elapsedRef.current;
        setElapsedSeconds(newVal);

        // Auto-stop at max duration (side effect outside state updater)
        if (newVal >= MAX_DURATION_SECONDS) {
          if (cameraRef.current) {
            try { cameraRef.current.stopRecording(); } catch {}
          }
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      elapsedRef.current = 0;
      setElapsedSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current) return;
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION_SECONDS,
      });

      // Read duration from ref (updated by interval, no stale closure)
      const actualDuration = elapsedRef.current || MAX_DURATION_SECONDS;

      if (video?.uri) {
        navigation.replace('VideoRecommendPreview', {
          videoUri: video.uri,
          restaurantId,
          restaurantName,
          durationSeconds: actualDuration,
        });
      }
    } catch (err) {
      console.error('[VideoCapture] Recording error:', err);
    } finally {
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [restaurantId, restaurantName, navigation]);

  const stopRecording = useCallback(() => {
    if (!cameraRef.current) return;
    try {
      cameraRef.current.stopRecording();
    } catch (err) {
      console.error('[VideoCapture] Stop recording error:', err);
    }
  }, []);

  const toggleFacing = useCallback(() => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  // Permission not granted
  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="videocam-off-outline" size={64} color={colors.textMuted} />
        <Text style={styles.permissionTitle}>Camera & Microphone Access</Text>
        <Text style={styles.permissionText}>
          We need camera and microphone access to record your recommendation.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            requestCameraPermission();
            requestMicPermission();
          }}
        >
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = elapsedSeconds / MAX_DURATION_SECONDS;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {isRecording && (
            <View style={styles.timerContainer}>
              <View style={styles.recordingDot} />
              <Text style={styles.timerText}>
                {Math.floor(elapsedSeconds / 60)}:
                {String(elapsedSeconds % 60).padStart(2, '0')}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.topButton}
            onPress={toggleFacing}
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Positive Framing Overlay */}
        {showOverlay && (
          <Animated.View style={[styles.motivationOverlay, { opacity: overlayOpacity }]}>
            <Text style={styles.motivationTitle}>
              Show us what you love{'\n'}about {restaurantName}
            </Text>
            <Text style={styles.motivationSubtext}>
              Great food, great vibes, great people — share the good stuff
            </Text>
          </Animated.View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          {/* Progress ring around record button */}
          <View style={styles.recordButtonOuter}>
            {isRecording && (
              <View style={styles.progressRing}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      borderColor: '#ef4444',
                      // Simple visual progress — full ring approach
                      opacity: progress,
                    },
                  ]}
                />
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.7}
            >
              {isRecording ? (
                <View style={styles.stopSquare} />
              ) : (
                <View style={styles.recordCircle} />
              )}
            </TouchableOpacity>
          </View>

          {!isRecording && (
            <Text style={styles.hintText}>
              Tap to record · {MAX_DURATION_SECONDS}s max
            </Text>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 20,
    textAlign: 'center' as const,
  },
  permissionText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 12,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.full,
    marginTop: 24,
  },
  permissionButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  topBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  timerContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  timerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums' as const],
  },
  motivationOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 32,
  },
  motivationTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFF',
    textAlign: 'center' as const,
    lineHeight: 36,
  },
  motivationSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center' as const,
    marginTop: 12,
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    paddingBottom: Platform.OS === 'ios' ? 50 : 32,
  },
  recordButtonOuter: {
    width: 80,
    height: 80,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  progressRing: {
    position: 'absolute' as const,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    position: 'absolute' as const,
    width: '100%' as const,
    height: '100%' as const,
    borderRadius: 40,
    borderWidth: 4,
  },
  recordButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  recordButtonActive: {
    borderColor: '#ef4444',
  },
  recordCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ef4444',
  },
  stopSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '500' as const,
  },
}));
