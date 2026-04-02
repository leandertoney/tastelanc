/**
 * VideoEditorScreen — TikTok-style full-screen video editor.
 * Sits between VideoRecommendCaptureScreen and VideoRecommendPreviewScreen.
 *
 * Tools:
 *   "Aa" (Text) — keyboard opens immediately, live preview of text on video,
 *                 style toolbar above keyboard (color + size), Done places it,
 *                 overlays are draggable, long-press to delete.
 *   "CC" (Captions) — uploads first clip, runs Whisper server-side, shows
 *                     synced word-by-word captions on the video.
 *
 * "Next" navigates to VideoRecommendPreviewScreen with all overlay/caption data.
 */
import { useState, useCallback, useEffect, useRef, useMemo, LayoutChangeEvent } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  InputAccessoryView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors, getAnonKey } from '../config/theme';
import { uploadRecommendationVideo } from '../lib/videoRecommendations';
import { useAuth } from '../hooks/useAuth';
import type { TextOverlay, TextOverlayColor, TextOverlaySize, TextOverlayAlign, CaptionWord } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoEditor'>;

const { width: SW, height: SH } = Dimensions.get('window');
// Fixed width for all overlays — makes text alignment visible and centering consistent
const OVERLAY_WIDTH = SW * 0.85;

// ── Style constants ───────────────────────────────────────────────────────────

// Standard TikTok-style color palette — 10 colors, fits in one row without scrolling
const OVERLAY_COLORS: string[] = [
  '#FFFFFF', // White
  '#111111', // Black
  '#FF3B30', // Red
  '#FF2D78', // Pink
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#5AC8FA', // Teal
  '#007AFF', // Blue
  '#AF52DE', // Purple
];

const OVERLAY_SIZES: { value: TextOverlaySize; fontSize: number; label: string }[] = [
  { value: 'small', fontSize: 16, label: 'S' },
  { value: 'medium', fontSize: 22, label: 'M' },
  { value: 'large', fontSize: 30, label: 'L' },
];

function getFontSize(size: TextOverlaySize) {
  return OVERLAY_SIZES.find(s => s.value === size)?.fontSize ?? 22;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const STYLE_TOOLBAR_ID = 'video-editor-toolbar';

// ── Draggable overlay ─────────────────────────────────────────────────────────
// Uses react-native-gesture-handler v2 Gesture API so Pan + Pinch run simultaneously.
// GestureHandlerRootView is already set up in all three App.tsx files.

function DraggableOverlay({
  overlay,
  onMove,
  onScale,
  onEdit,
  onDelete,
}: {
  overlay: TextOverlay;
  onMove: (id: string, x: number, y: number) => void;
  onScale: (id: string, scale: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const fontSize = getFontSize(overlay.size);
  const color = overlay.color; // already hex
  // Light colors need a dark shadow, dark colors need a light shadow
  // Light colors need a dark shadow for contrast; dark colors get a light shadow
  const isLight = color === '#FFFFFF' || color === '#FFCC00' || color === '#FF9500';
  const shadowColor = isLight ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.4)';

  // Shared values — live in the UI thread, not JS thread
  // x = -1 is a sentinel meaning "auto-center on first layout"
  const initialX = overlay.x < 0 ? 0 : overlay.x * SW;
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(overlay.y * SH);
  const savedX = useSharedValue(initialX);
  const savedY = useSharedValue(overlay.y * SH);
  const scale = useSharedValue(overlay.scale ?? 1);
  const savedScale = useSharedValue(overlay.scale ?? 1);
  const hasAutocentered = useRef(false);

  // On first layout of a new overlay (x < 0), center the fixed-width block
  const handleLayout = useCallback((_e: LayoutChangeEvent) => {
    if (!hasAutocentered.current && overlay.x < 0) {
      hasAutocentered.current = true;
      const cx = (SW - OVERLAY_WIDTH) / 2;
      translateX.value = cx;
      savedX.value = cx;
      runOnJS(onMove)(overlay.id, cx / SW, overlay.y);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      const nx = Math.max(0, Math.min(1, translateX.value / SW));
      const ny = Math.max(0, Math.min(1, translateY.value / SH));
      runOnJS(onMove)(overlay.id, nx, ny);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(4, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(onScale)(overlay.id, scale.value);
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .onEnd(() => runOnJS(onEdit)(overlay.id));

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => runOnJS(onDelete)(overlay.id));

  // Pan + Pinch simultaneously (two-finger drag+scale); Tap/LongPress exclusive
  const composed = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    Gesture.Exclusive(longPressGesture, tapGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[s.overlayWrap, animatedStyle]} onLayout={handleLayout}>
        <Text
          style={{
            width: OVERLAY_WIDTH,
            fontSize,
            color,
            fontWeight: '800',
            textAlign: overlay.align ?? 'center',
            textShadowColor: shadowColor,
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 4,
          }}
        >
          {overlay.text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

// ── Caption chunk builder ─────────────────────────────────────────────────────

function buildChunks(words: CaptionWord[], size = 5) {
  const out: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < words.length; i += size) {
    const g = words.slice(i, i + size);
    out.push({ text: g.map(w => w.word).join(' ').trim(), start: g[0].start, end: g[g.length - 1].end });
  }
  return out;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function VideoEditorScreen({ route, navigation }: Props) {
  const { clips, restaurantId, restaurantName, durationSeconds } = route.params;
  const colors = getColors();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  // Video player — full screen, loops
  const player = useVideoPlayer(clips[0].uri, (p) => { p.loop = true; p.play(); });

  // Pause when navigating to preview, resume when coming back — prevents dual playback
  useFocusEffect(useCallback(() => {
    try { player.play(); } catch {}
    return () => { try { player.pause(); } catch {} };
  }, [player]));

  // Multi-clip rotation
  useEffect(() => {
    if (clips.length <= 1) return;
    let idx = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        idx = (idx + 1) % clips.length;
        try { player.replace(clips[idx].uri); player.play(); } catch {}
        next();
      }, clips[idx].duration * 1000);
    };
    next();
    return () => clearTimeout(t);
  }, [clips, player]);

  // ── Text overlay state ──
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [isTyping, setIsTyping] = useState(false);   // keyboard open, editing new text
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState<string>('#FFFFFF');
  const [draftSize, setDraftSize] = useState<TextOverlaySize>('medium');
  const [draftAlign, setDraftAlign] = useState<TextOverlayAlign>('center');
  const inputRef = useRef<TextInput>(null);

  // ── Caption state ──
  const [captionsLoading, setCaptionsLoading] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionWords, setCaptionWords] = useState<CaptionWord[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  const captionChunks = useMemo(() => buildChunks(captionWords), [captionWords]);
  const activeChunk = useMemo(
    () => captionChunks.find(c => currentTime >= c.start && currentTime <= c.end) ?? null,
    [captionChunks, currentTime],
  );

  // Subscribe to playback time for caption sync
  useEffect(() => {
    if (!captionsEnabled || !captionChunks.length) return;
    try { (player as any).timeUpdateEventInterval = 0.1; } catch {}
    const sub = player.addListener('timeUpdate', ({ currentTime: t }: { currentTime: number }) => setCurrentTime(t));
    return () => { try { sub.remove(); } catch {} };
  }, [player, captionsEnabled, captionChunks.length]);

  // ── Text tool handlers ──
  const openTextTool = useCallback(() => {
    setEditingOverlayId(null);
    setDraftText('');
    setDraftAlign('center');
    setIsTyping(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const commitText = useCallback(() => {
    Keyboard.dismiss();
    const trimmed = draftText.trim();
    if (trimmed) {
      if (editingOverlayId) {
        // Update existing overlay — preserve position and scale
        setOverlays(prev => prev.map(o =>
          o.id === editingOverlayId
            ? { ...o, text: trimmed, color: draftColor, size: draftSize, align: draftAlign }
            : o
        ));
      } else {
        // x: -1 = sentinel for "auto-center on first layout" in DraggableOverlay
        setOverlays(prev => [...prev, {
          id: uid(),
          text: trimmed,
          x: -1,
          y: 0.35,
          color: draftColor,
          size: draftSize,
          align: draftAlign,
          scale: 1,
        }]);
      }
    }
    setDraftText('');
    setEditingOverlayId(null);
    setIsTyping(false);
  }, [draftText, draftColor, draftSize, draftAlign, editingOverlayId]);

  const handleOverlayMove = useCallback((id: string, x: number, y: number) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, x, y } : o));
  }, []);

  const handleOverlayScale = useCallback((id: string, newScale: number) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, scale: newScale } : o));
  }, []);

  // Tap an overlay → pre-fill draft and open keyboard to edit it
  const handleOverlayEdit = useCallback((id: string) => {
    const ov = overlays.find(o => o.id === id);
    if (!ov) return;
    setDraftText(ov.text);
    setDraftColor(ov.color);
    setDraftSize(ov.size);
    setDraftAlign(ov.align ?? 'center');
    setEditingOverlayId(id);
    setIsTyping(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [overlays]);

  // Long press → confirm delete
  const handleOverlayDelete = useCallback((id: string) => {
    const ov = overlays.find(o => o.id === id);
    Alert.alert('Remove Text', `Remove "${ov?.text ?? 'this text'}"?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setOverlays(prev => prev.filter(o => o.id !== id)) },
    ]);
  }, [overlays]);

  // ── Caption (CC) handler ──
  const handleToggleCaptions = useCallback(async () => {
    if (captionsEnabled) {
      setCaptionsEnabled(false);
      return;
    }

    if (captionWords.length > 0) {
      // Already generated, just re-enable
      setCaptionsEnabled(true);
      return;
    }

    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to use auto-captions.');
      return;
    }

    setCaptionsLoading(true);
    try {
      // Upload the first clip to get a public URL for Whisper
      let videoUrl: string;
      try {
        videoUrl = await uploadRecommendationVideo(userId, clips[0].uri);
      } catch (uploadErr: any) {
        Alert.alert('Upload failed', `Could not upload video for captions: ${uploadErr.message}`);
        return;
      }

      // Call the transcribe endpoint
      const anonKey = getAnonKey();
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://tastelanc.com';
      const res = await fetch(`${baseUrl}/api/instagram/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Transcription failed (${res.status})`);
      }

      const words: CaptionWord[] = data.words || [];

      if (words.length === 0) {
        Alert.alert('No speech detected', 'We couldn\'t detect any speech in your video. Captions work best with clear audio.');
        return;
      }

      setCaptionWords(words);
      setCaptionsEnabled(true);
    } catch (err: any) {
      console.error('[VideoEditor] Caption generation failed:', err);
      Alert.alert('Caption error', err.message || 'Failed to generate captions. Please try again.');
    } finally {
      setCaptionsLoading(false);
    }
  }, [captionsEnabled, captionWords.length, userId, clips]);

  // ── Next → navigate to preview ──
  const handleNext = useCallback(() => {
    if (isTyping) commitText();
    navigation.navigate('VideoRecommendPreview', {
      clips,
      restaurantId,
      restaurantName,
      durationSeconds,
      textOverlays: overlays.length > 0 ? overlays : undefined,
      captionWords: captionWords.length > 0 ? captionWords : undefined,
      captionsEnabled,
    });
  }, [isTyping, commitText, navigation, clips, restaurantId, restaurantName, durationSeconds, overlays, captionWords, captionsEnabled]);

  const draftFontSize = getFontSize(draftSize);
  const draftIsLight = draftColor === '#FFFFFF' || draftColor === '#FFCC00' || draftColor === '#FF9500';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen video */}
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />

      {/* Dark scrim so text is readable */}
      <View style={s.scrim} pointerEvents="none" />

      {/* Placed text overlays — hide the one currently being edited (inline editor shows it) */}
      {overlays.map(o => o.id === editingOverlayId ? null : (
        <DraggableOverlay
          key={o.id}
          overlay={o}
          onMove={handleOverlayMove}
          onScale={handleOverlayScale}
          onEdit={handleOverlayEdit}
          onDelete={handleOverlayDelete}
        />
      ))}

      {/* Inline text editor — fully visible on video, TikTok-style */}
      {isTyping && (
        <View style={s.inlineEditorWrap} pointerEvents="box-none">
          <TextInput
            ref={inputRef}
            style={[
              s.inlineEditor,
              {
                fontSize: draftFontSize,
                color: draftColor,
                textAlign: draftAlign,
                textShadowColor: draftIsLight ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.3)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 4,
              },
            ]}
            value={draftText}
            onChangeText={setDraftText}
            multiline
            autoFocus
            selectionColor={draftColor}
            inputAccessoryViewID={Platform.OS === 'ios' ? STYLE_TOOLBAR_ID : undefined}
            maxLength={120}
            placeholder="Type something..."
            placeholderTextColor="rgba(255,255,255,0.45)"
          />
        </View>
      )}

      {/* Caption subtitle bar — synced to playback */}
      {captionsEnabled && activeChunk && (
        <View style={s.captionBar} pointerEvents="none">
          <Text style={s.captionBarText}>{activeChunk.text}</Text>
        </View>
      )}

      {/* Caption loading overlay */}
      {captionsLoading && (
        <View style={s.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={s.loadingText}>Generating captions...</Text>
        </View>
      )}

      {/* Top bar: back + restaurant name + Next */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.topBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>{restaurantName}</Text>
        <TouchableOpacity style={s.nextBtn} onPress={handleNext}>
          <Text style={s.nextBtnText}>Next</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Right-side tool buttons — hidden while keyboard is open */}
      {!isTyping && (
        <View style={[s.toolBar, { top: insets.top + 70 }]}>
          {/* Text tool */}
          <TouchableOpacity style={s.toolBtn} onPress={openTextTool} activeOpacity={0.8}>
            <Text style={s.toolBtnText}>Aa</Text>
          </TouchableOpacity>

          {/* CC / Captions tool */}
          <TouchableOpacity
            style={[s.toolBtn, captionsEnabled && s.toolBtnActive]}
            onPress={handleToggleCaptions}
            disabled={captionsLoading}
            activeOpacity={0.8}
          >
            {captionsLoading
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={[s.toolBtnText, captionsEnabled && s.toolBtnTextActive]}>CC</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* iOS: style toolbar pinned above keyboard via InputAccessoryView */}
      {Platform.OS === 'ios' && isTyping && (
        <InputAccessoryView nativeID={STYLE_TOOLBAR_ID}>
          <StyleToolbar
            color={draftColor}
            size={draftSize}
            align={draftAlign}
            onColorChange={setDraftColor}
            onSizeChange={setDraftSize}
            onAlignChange={setDraftAlign}
            onDone={commitText}
          />
        </InputAccessoryView>
      )}

      {/* Android: style toolbar rendered at the bottom when keyboard is open */}
      {Platform.OS === 'android' && isTyping && (
        <View style={[s.androidToolbar, { bottom: insets.bottom + 8 }]}>
          <StyleToolbar
            color={draftColor}
            size={draftSize}
            align={draftAlign}
            onColorChange={setDraftColor}
            onSizeChange={setDraftSize}
            onAlignChange={setDraftAlign}
            onDone={commitText}
          />
        </View>
      )}
    </View>
  );
}

// ── Style toolbar (above keyboard) ────────────────────────────────────────────

const ALIGN_OPTIONS: { value: TextOverlayAlign; icon: string }[] = [
  { value: 'left',   icon: '⬛\u200A⬜\u200A⬜' },
  { value: 'center', icon: '⬜\u200A⬛\u200A⬜' },
  { value: 'right',  icon: '⬜\u200A⬜\u200A⬛' },
];

function StyleToolbar({
  color,
  size,
  align,
  onColorChange,
  onSizeChange,
  onAlignChange,
  onDone,
}: {
  color: string;
  size: TextOverlaySize;
  align: TextOverlayAlign;
  onColorChange: (c: string) => void;
  onSizeChange: (s: TextOverlaySize) => void;
  onAlignChange: (a: TextOverlayAlign) => void;
  onDone: () => void;
}) {
  return (
    <View style={tb.container}>
      {/* Row 1: color swatches — 10 colors, fits without scrolling */}
      <View style={tb.colorRow}>
        {OVERLAY_COLORS.map(hex => (
          <TouchableOpacity
            key={hex}
            style={[
              tb.swatch,
              { backgroundColor: hex },
              hex === '#FFFFFF' && tb.swatchWhite,
              color === hex && tb.swatchSelected,
            ]}
            onPress={() => onColorChange(hex)}
          />
        ))}
      </View>
      {/* Row 2: size  |  align  |  Done */}
      <View style={tb.row}>
        <Text style={tb.rowLabel}>Size</Text>
        {OVERLAY_SIZES.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[tb.sizeBtn, size === s.value && tb.sizeBtnSelected]}
            onPress={() => onSizeChange(s.value)}
          >
            <Text style={[tb.sizeBtnText, { fontSize: s.fontSize * 0.6 }, size === s.value && tb.sizeBtnTextSelected]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={tb.divider} />
        <Text style={tb.rowLabel}>Align</Text>
        {ALIGN_OPTIONS.map(a => (
          <TouchableOpacity
            key={a.value}
            style={[tb.sizeBtn, align === a.value && tb.sizeBtnSelected]}
            onPress={() => onAlignChange(a.value)}
          >
            <Text style={[tb.alignBtnText, align === a.value && tb.sizeBtnTextSelected]}>
              {a.value === 'left' ? '←' : a.value === 'center' ? '↔' : '→'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={tb.doneBtn} onPress={onDone}>
          <Text style={tb.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlayWrap: { position: 'absolute', zIndex: 20 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 1,
  },
  topBar: {
    position: 'absolute', left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  topTitle: {
    flex: 1, textAlign: 'center', color: '#FFF',
    fontSize: 16, fontWeight: '600', marginHorizontal: 8,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  nextBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  toolBar: {
    position: 'absolute', right: 12, zIndex: 30,
    alignItems: 'center', gap: 12,
  },
  toolBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  toolBtnActive: {
    backgroundColor: 'rgba(34,197,94,0.3)',
    borderColor: '#22c55e',
  },
  toolBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  toolBtnTextActive: { color: '#22c55e' },
  // Inline text editor — visible on video at vertical center, fully editable
  inlineEditorWrap: {
    position: 'absolute', zIndex: 25,
    left: 0, right: 0, top: '30%',
    alignItems: 'center',
  },
  inlineEditor: {
    width: OVERLAY_WIDTH,        // same fixed width as placed overlay
    fontWeight: '800',
    backgroundColor: 'transparent',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
  },
  captionBar: {
    position: 'absolute', bottom: 140, left: 20, right: 20, zIndex: 25,
    alignItems: 'center',
  },
  captionBarText: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#FFF', fontSize: 17, fontWeight: '600',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6,
    textAlign: 'center', overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute', zIndex: 40,
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  loadingText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  androidToolbar: { position: 'absolute', left: 0, right: 0, zIndex: 40 },
});

const tb = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15,15,15,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingBottom: 6,
  },
  // Row 1: horizontally scrollable color swatches
  colorRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  swatch: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  swatchWhite: { borderColor: 'rgba(180,180,180,0.6)' },
  swatchSelected: {
    borderColor: '#FFF',
    transform: [{ scale: 1.25 }],
    shadowColor: '#FFF',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  // Row 2: size + Done
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingBottom: 4,
  },
  rowLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginRight: 2 },
  sizeBtn: {
    width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sizeBtnSelected: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: '#FFF' },
  sizeBtnText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  sizeBtnTextSelected: { color: '#FFF' },
  alignBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' },
  divider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
  doneBtn: {
    marginLeft: 'auto' as any, paddingHorizontal: 18, paddingVertical: 8,
    backgroundColor: '#FFF', borderRadius: 18,
  },
  doneBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
});
