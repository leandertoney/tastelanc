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
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  PanResponder,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  InputAccessoryView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors, getAnonKey } from '../config/theme';
import { uploadRecommendationVideo } from '../lib/videoRecommendations';
import { useAuth } from '../hooks/useAuth';
import type { TextOverlay, TextOverlayColor, TextOverlaySize, CaptionWord } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoEditor'>;

const { width: SW, height: SH } = Dimensions.get('window');

// ── Style constants ───────────────────────────────────────────────────────────

const OVERLAY_COLORS: { value: TextOverlayColor; hex: string; label: string }[] = [
  { value: 'white', hex: '#FFFFFF', label: 'White' },
  { value: 'yellow', hex: '#FACC15', label: 'Yellow' },
  { value: 'black', hex: '#111111', label: 'Black' },
  { value: 'orange', hex: '#F97316', label: 'Orange' },
];

const OVERLAY_SIZES: { value: TextOverlaySize; fontSize: number; label: string }[] = [
  { value: 'small', fontSize: 16, label: 'S' },
  { value: 'medium', fontSize: 22, label: 'M' },
  { value: 'large', fontSize: 30, label: 'L' },
];

function getFontSize(size: TextOverlaySize) {
  return OVERLAY_SIZES.find(s => s.value === size)?.fontSize ?? 22;
}

function getHex(color: TextOverlayColor) {
  return OVERLAY_COLORS.find(c => c.value === color)?.hex ?? '#FFF';
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const STYLE_TOOLBAR_ID = 'video-editor-toolbar';

// ── Draggable overlay ─────────────────────────────────────────────────────────

function DraggableOverlay({
  overlay,
  onMove,
  onDelete,
}: {
  overlay: TextOverlay;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}) {
  const anim = useRef(new Animated.ValueXY({ x: overlay.x * SW, y: overlay.y * SH })).current;
  const fontSize = getFontSize(overlay.size);
  const color = getHex(overlay.color);
  const hasDarkBg = overlay.color === 'white' || overlay.color === 'yellow';

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        anim.setOffset({ x: (anim.x as any)._value, y: (anim.y as any)._value });
        anim.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: anim.x, dy: anim.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        anim.flattenOffset();
        const x = Math.max(0, Math.min(SW - 20, (anim.x as any)._value as number));
        const y = Math.max(0, Math.min(SH - 40, (anim.y as any)._value as number));
        onMove(overlay.id, x / SW, y / SH);
      },
    })
  ).current;

  return (
    <Animated.View
      style={{ position: 'absolute', zIndex: 20, transform: anim.getTranslateTransform() }}
      {...pan.panHandlers}
    >
      <TouchableOpacity
        onLongPress={() =>
          Alert.alert('Remove Text', `Remove "${overlay.text}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => onDelete(overlay.id) },
          ])
        }
        activeOpacity={0.85}
      >
        <Text
          style={{
            fontSize,
            color,
            fontWeight: '800',
            textShadowColor: hasDarkBg ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.4)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 4,
          }}
        >
          {overlay.text}
        </Text>
      </TouchableOpacity>
    </Animated.View>
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
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState<TextOverlayColor>('white');
  const [draftSize, setDraftSize] = useState<TextOverlaySize>('medium');
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
    setDraftText('');
    setIsTyping(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const commitText = useCallback(() => {
    Keyboard.dismiss();
    if (draftText.trim()) {
      setOverlays(prev => [...prev, {
        id: uid(),
        text: draftText.trim(),
        // Start at ~center of screen (normalized)
        x: 0.1,
        y: 0.35,
        color: draftColor,
        size: draftSize,
      }]);
    }
    setDraftText('');
    setIsTyping(false);
  }, [draftText, draftColor, draftSize]);

  const handleOverlayMove = useCallback((id: string, x: number, y: number) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, x, y } : o));
  }, []);

  const handleOverlayDelete = useCallback((id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
  }, []);

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
      const videoUrl = await uploadRecommendationVideo(userId, clips[0].uri);

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

      if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
      const data = await res.json();
      const words: CaptionWord[] = data.words || [];

      if (words.length === 0) {
        Alert.alert('No speech detected', 'We couldn\'t detect any speech in your video. Captions work best with clear audio.');
        return;
      }

      setCaptionWords(words);
      setCaptionsEnabled(true);
    } catch (err: any) {
      console.error('[VideoEditor] Caption generation failed:', err);
      Alert.alert('Caption error', 'Failed to generate captions. Please try again.');
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
  const draftHex = getHex(draftColor);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen video */}
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />

      {/* Dark scrim so text is readable */}
      <View style={s.scrim} pointerEvents="none" />

      {/* Placed text overlays — draggable */}
      {overlays.map(o => (
        <DraggableOverlay key={o.id} overlay={o} onMove={handleOverlayMove} onDelete={handleOverlayDelete} />
      ))}

      {/* Live draft text preview — shown while keyboard is open */}
      {isTyping && draftText.length > 0 && (
        <View style={s.draftPreview} pointerEvents="none">
          <Text style={{
            fontSize: draftFontSize,
            color: draftHex,
            fontWeight: '800',
            textShadowColor: 'rgba(0,0,0,0.9)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 4,
            textAlign: 'center',
          }}>
            {draftText}
          </Text>
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

      {/* Text input + style toolbar — shown while typing */}
      {isTyping && (
        <KeyboardAvoidingView
          style={StyleSheet.absoluteFill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <View style={s.typingContainer} pointerEvents="box-none">
            {/* Invisible input — text appears as draftPreview on the video */}
            <TextInput
              ref={inputRef}
              style={s.hiddenInput}
              value={draftText}
              onChangeText={setDraftText}
              onSubmitEditing={commitText}
              autoFocus
              multiline={false}
              returnKeyType="done"
              blurOnSubmit
              onBlur={commitText}
              inputAccessoryViewID={Platform.OS === 'ios' ? STYLE_TOOLBAR_ID : undefined}
              maxLength={80}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* iOS: style toolbar pinned above keyboard via InputAccessoryView */}
      {Platform.OS === 'ios' && isTyping && (
        <InputAccessoryView nativeID={STYLE_TOOLBAR_ID}>
          <StyleToolbar
            color={draftColor}
            size={draftSize}
            onColorChange={setDraftColor}
            onSizeChange={setDraftSize}
            onDone={commitText}
          />
        </InputAccessoryView>
      )}

      {/* Android: style toolbar rendered just above the bottom */}
      {Platform.OS === 'android' && isTyping && (
        <View style={[s.androidToolbar, { bottom: insets.bottom + 8 }]}>
          <StyleToolbar
            color={draftColor}
            size={draftSize}
            onColorChange={setDraftColor}
            onSizeChange={setDraftSize}
            onDone={commitText}
          />
        </View>
      )}
    </View>
  );
}

// ── Style toolbar (above keyboard) ────────────────────────────────────────────

function StyleToolbar({
  color,
  size,
  onColorChange,
  onSizeChange,
  onDone,
}: {
  color: TextOverlayColor;
  size: TextOverlaySize;
  onColorChange: (c: TextOverlayColor) => void;
  onSizeChange: (s: TextOverlaySize) => void;
  onDone: () => void;
}) {
  return (
    <View style={tb.container}>
      {/* Color swatches */}
      <View style={tb.row}>
        {OVERLAY_COLORS.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[tb.swatch, { backgroundColor: c.hex }, color === c.value && tb.swatchSelected]}
            onPress={() => onColorChange(c.value)}
          />
        ))}
        <View style={tb.divider} />
        {/* Size buttons */}
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
  draftPreview: {
    position: 'absolute', zIndex: 25,
    left: 0, right: 0, top: '35%',
    alignItems: 'center', paddingHorizontal: 20,
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
  typingContainer: {
    flex: 1, justifyContent: 'flex-end',
  },
  hiddenInput: {
    // Off-screen — text appears via draftPreview on the video instead
    position: 'absolute',
    bottom: -100,
    left: 0,
    right: 0,
    opacity: 0,
    height: 40,
  },
  androidToolbar: { position: 'absolute', left: 0, right: 0, zIndex: 40 },
});

const tb = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: '#FFF', transform: [{ scale: 1.2 }] },
  divider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
  sizeBtn: {
    width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sizeBtnSelected: { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: '#FFF' },
  sizeBtnText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  sizeBtnTextSelected: { color: '#FFF' },
  doneBtn: {
    marginLeft: 'auto' as any, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#FFF', borderRadius: 16,
  },
  doneBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
});
