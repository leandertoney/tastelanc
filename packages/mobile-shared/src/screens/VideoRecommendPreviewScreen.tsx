/**
 * VideoRecommendPreviewScreen — preview recorded video, add text overlays,
 * toggle auto-captions, pick a tag, write a caption, then post.
 *
 * Editing tools (floating over the video):
 *   "Aa" button → opens text overlay editor modal (type text, pick color/size, drag to position)
 *   "CC" button → toggles auto-generated closed captions (generated from speech after posting)
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Modal,
  PanResponder,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useSignUpModal } from '../context/SignUpModalContext';
import {
  uploadRecommendationVideo,
  uploadRecommendationThumbnail,
  createRecommendation,
  MAX_CAPTION_LENGTH,
} from '../lib/videoRecommendations';
import { queryKeys } from '../lib/queryKeys';
import { earnPoints } from '../lib/rewards';
import { useQueryClient } from '@tanstack/react-query';
import { ALL_CAPTION_TAGS, CAPTION_TAG_LABELS } from '../types/database';
import type { CaptionTag, TextOverlay, TextOverlayColor, TextOverlaySize } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoRecommendPreview'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_WIDTH = SCREEN_WIDTH - 32; // 16px margin each side
const VIDEO_HEIGHT = 360;

const OVERLAY_COLORS: { value: TextOverlayColor; hex: string }[] = [
  { value: 'white', hex: '#FFFFFF' },
  { value: 'yellow', hex: '#FACC15' },
  { value: 'black', hex: '#111111' },
  { value: 'orange', hex: '#F97316' },
];

const OVERLAY_SIZES: { value: TextOverlaySize; label: string; fontSize: number }[] = [
  { value: 'small', label: 'S', fontSize: 14 },
  { value: 'medium', label: 'M', fontSize: 18 },
  { value: 'large', label: 'L', fontSize: 24 },
];

function overlayFontSize(size: TextOverlaySize): number {
  return OVERLAY_SIZES.find(s => s.value === size)?.fontSize ?? 18;
}

function overlayHex(color: TextOverlayColor): string {
  return OVERLAY_COLORS.find(c => c.value === color)?.hex ?? '#FFFFFF';
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Draggable text overlay on the video preview ────────────────────────────

interface DraggableOverlayProps {
  overlay: TextOverlay;
  onPositionChange: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onScrollEnable: (enabled: boolean) => void;
}

function DraggableOverlay({ overlay, onPositionChange, onDelete, onScrollEnable }: DraggableOverlayProps) {
  const anim = useRef(new Animated.ValueXY({
    x: overlay.x * VIDEO_WIDTH,
    y: overlay.y * VIDEO_HEIGHT,
  })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onScrollEnable(false);
        anim.setOffset({ x: (anim.x as any)._value, y: (anim.y as any)._value });
        anim.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: anim.x, dy: anim.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        onScrollEnable(true);
        anim.flattenOffset();
        const rawX = (anim.x as any)._value as number;
        const rawY = (anim.y as any)._value as number;
        const clampedX = Math.max(0, Math.min(VIDEO_WIDTH - 20, rawX));
        const clampedY = Math.max(0, Math.min(VIDEO_HEIGHT - 30, rawY));
        onPositionChange(overlay.id, clampedX / VIDEO_WIDTH, clampedY / VIDEO_HEIGHT);
      },
    })
  ).current;

  const fontSize = overlayFontSize(overlay.size);
  const color = overlayHex(overlay.color);
  const textShadow = overlay.color === 'white' || overlay.color === 'yellow'
    ? { textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }
    : { textShadowColor: 'rgba(255,255,255,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 };

  return (
    <Animated.View
      style={{ position: 'absolute', transform: anim.getTranslateTransform() }}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        onLongPress={() => Alert.alert('Remove Text', `Remove "${overlay.text}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => onDelete(overlay.id) },
        ])}
        activeOpacity={0.85}
      >
        <Text style={[{ fontSize, color, fontWeight: '700' }, textShadow]}>
          {overlay.text}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function VideoRecommendPreviewScreen({ route, navigation }: Props) {
  const colors = getColors();
  const brand = getBrand();
  const styles = useStyles();
  const { userId, isAnonymous } = useAuth();
  const { market } = useMarket();
  const { showSignUpModal } = useSignUpModal();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const { clips, restaurantId, restaurantName, durationSeconds } = route.params as {
    clips: { uri: string; duration: number }[];
    restaurantId: string;
    restaurantName: string;
    durationSeconds: number;
  };

  const previewPlayer = useVideoPlayer(clips[0].uri, (p) => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    if (clips.length <= 1) return;
    let clipIdx = 0;
    let timerId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      timerId = setTimeout(() => {
        clipIdx = (clipIdx + 1) % clips.length;
        try { previewPlayer.replace(clips[clipIdx].uri); previewPlayer.play(); } catch {}
        scheduleNext();
      }, clips[clipIdx].duration * 1000);
    };
    scheduleNext();
    return () => clearTimeout(timerId);
  }, [clips, previewPlayer]);

  // ── Form state ──
  const [caption, setCaption] = useState('');
  const [selectedTag, setSelectedTag] = useState<CaptionTag | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const hasPosted = useRef(false);

  // ── Editor state ──
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [newText, setNewText] = useState('');
  const [newColor, setNewColor] = useState<TextOverlayColor>('white');
  const [newSize, setNewSize] = useState<TextOverlaySize>('medium');

  const handleOverlayPositionChange = useCallback((id: string, x: number, y: number) => {
    setTextOverlays(prev => prev.map(o => o.id === id ? { ...o, x, y } : o));
  }, []);

  const handleDeleteOverlay = useCallback((id: string) => {
    setTextOverlays(prev => prev.filter(o => o.id !== id));
  }, []);

  const handleAddOverlay = useCallback(() => {
    if (!newText.trim()) return;
    const overlay: TextOverlay = {
      id: generateId(),
      text: newText.trim(),
      x: 0.1,
      y: 0.2,
      color: newColor,
      size: newSize,
    };
    setTextOverlays(prev => [...prev, overlay]);
    setNewText('');
    setEditorVisible(false);
  }, [newText, newColor, newSize]);

  // Warn if leaving without posting
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (hasPosted.current || isPosting) return;
      e.preventDefault();
      Alert.alert(
        'Discard Recommendation?',
        'You haven\'t posted your recommendation yet. Are you sure you want to leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, isPosting]);

  const handleTagPress = useCallback((tag: CaptionTag) => {
    setSelectedTag(prev => prev === tag ? null : tag);
  }, []);

  const handlePost = useCallback(async () => {
    if (!userId || isAnonymous) {
      showSignUpModal({ action: 'post_recommendation' });
      return;
    }
    if (!market?.id) {
      Alert.alert('Error', 'Market data not available. Please try again.');
      return;
    }

    setIsPosting(true);
    try {
      let thumbnailUrl: string | null = null;
      try {
        const thumbResult = await VideoThumbnails.getThumbnailAsync(clips[0].uri, { time: 1000 });
        if (thumbResult.uri) thumbnailUrl = await uploadRecommendationThumbnail(userId, thumbResult.uri);
      } catch {}

      const videoUrls: string[] = [];
      for (const clip of clips) {
        videoUrls.push(await uploadRecommendationVideo(userId, clip.uri));
      }

      await createRecommendation({
        userId,
        restaurantId,
        marketId: market.id,
        videoUrls,
        thumbnailUrl,
        caption: caption.trim() || null,
        captionTag: selectedTag,
        durationSeconds,
        captionsEnabled,
        textOverlays: textOverlays.length > 0 ? textOverlays : undefined,
      });

      let pointsEarned = 0;
      try {
        const reward = await earnPoints({ action_type: 'video_recommendation', restaurant_id: restaurantId, radar_verified: false });
        pointsEarned = reward.points_earned;
      } catch {}

      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.byRestaurant(restaurantId) });

      hasPosted.current = true;
      const pointsMsg = pointsEarned > 0 ? ` You earned ${pointsEarned} points!` : '';
      const captionMsg = captionsEnabled ? '\n\nCaptions will be generated from your speech and appear shortly.' : '';
      Alert.alert(
        'Recommendation Submitted!',
        `Your recommendation for ${restaurantName} is being reviewed and will be live shortly.${pointsMsg}${captionMsg}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      console.error('[VideoPreview] Post error:', err);
      Alert.alert('Error', 'Failed to post your recommendation. Please try again.');
    } finally {
      setIsPosting(false);
    }
  }, [
    userId, isAnonymous, market, clips, restaurantId, restaurantName,
    caption, selectedTag, durationSeconds, captionsEnabled, textOverlays,
    navigation, queryClient, showSignUpModal,
  ]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Recommendation</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Video Preview with overlay editor */}
        <View style={styles.videoContainer}>
          <VideoView player={previewPlayer} style={styles.video} contentFit="cover" nativeControls={false} />

          {/* Text overlays — draggable */}
          {textOverlays.map(overlay => (
            <DraggableOverlay
              key={overlay.id}
              overlay={overlay}
              onPositionChange={handleOverlayPositionChange}
              onDelete={handleDeleteOverlay}
              onScrollEnable={(enabled) => scrollRef.current?.setNativeProps({ scrollEnabled: enabled })}
            />
          ))}

          {/* Segment badge */}
          {clips.length > 1 && (
            <View style={styles.segmentBadge}>
              <Ionicons name="layers-outline" size={14} color="#FFF" />
              <Text style={styles.segmentBadgeText}>{clips.length} clips</Text>
            </View>
          )}

          {/* Editor buttons — bottom-left of video */}
          <View style={styles.editorButtons}>
            <TouchableOpacity
              style={styles.editorBtn}
              onPress={() => setEditorVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editorBtnLabel}>Aa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editorBtn, captionsEnabled && styles.editorBtnActive]}
              onPress={() => setCaptionsEnabled(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={[styles.editorBtnLabel, captionsEnabled && styles.editorBtnLabelActive]}>CC</Text>
            </TouchableOpacity>
          </View>

          {/* Captions enabled indicator */}
          {captionsEnabled && (
            <View style={styles.captionsBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
              <Text style={styles.captionsBadgeText}>Auto-captions on</Text>
            </View>
          )}
        </View>

        {/* Hint if overlays exist */}
        {textOverlays.length > 0 && (
          <Text style={styles.overlayHint}>Long-press text on the video to remove it</Text>
        )}

        {/* Restaurant Name */}
        <View style={styles.restaurantRow}>
          <Ionicons name="restaurant-outline" size={16} color={colors.accent} />
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        </View>

        {/* Caption Tag Chips */}
        <Text style={styles.sectionLabel}>What should people know?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScroll}
          contentContainerStyle={styles.tagsContainer}
        >
          {ALL_CAPTION_TAGS.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                onPress={() => handleTagPress(tag)}
              >
                <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                  {CAPTION_TAG_LABELS[tag]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Caption Input */}
        <Text style={styles.sectionLabel}>Add a caption (optional)</Text>
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="What should people try here?"
            placeholderTextColor={colors.textSecondary}
            value={caption}
            onChangeText={setCaption}
            maxLength={MAX_CAPTION_LENGTH}
            multiline
            numberOfLines={2}
          />
          <Text style={styles.charCount}>{caption.length}/{MAX_CAPTION_LENGTH}</Text>
        </View>

        {/* Consent */}
        <Text style={styles.consentText}>
          By posting, you grant {brand.appName} permission to feature your recommendation.
        </Text>

        {/* Post Button */}
        <TouchableOpacity
          style={[styles.postButton, isPosting && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={isPosting}
          activeOpacity={0.8}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color={colors.textOnAccent} />
          ) : (
            <>
              <Ionicons name="heart" size={20} color={colors.textOnAccent} />
              <Text style={styles.postButtonText}>Post Recommendation</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reRecordButton}
          onPress={() => navigation.goBack()}
          disabled={isPosting}
        >
          <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
          <Text style={styles.reRecordText}>Back to camera</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Text overlay editor modal */}
      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.editorModal}>
            <View style={styles.editorModalHeader}>
              <Text style={styles.editorModalTitle}>Add Text</Text>
              <TouchableOpacity onPress={() => setEditorVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.overlayInput}
              placeholder="Type something..."
              placeholderTextColor={colors.textSecondary}
              value={newText}
              onChangeText={setNewText}
              maxLength={60}
              autoFocus
            />

            {/* Color picker */}
            <Text style={styles.editorPickerLabel}>Color</Text>
            <View style={styles.colorRow}>
              {OVERLAY_COLORS.map(({ value, hex }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: hex },
                    newColor === value && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setNewColor(value)}
                />
              ))}
            </View>

            {/* Size picker */}
            <Text style={styles.editorPickerLabel}>Size</Text>
            <View style={styles.sizeRow}>
              {OVERLAY_SIZES.map(({ value, label, fontSize }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.sizeBtn, newSize === value && styles.sizeBtnSelected]}
                  onPress={() => setNewSize(value)}
                >
                  <Text style={[styles.sizeBtnText, { fontSize }, newSize === value && styles.sizeBtnTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addOverlayBtn, !newText.trim() && styles.addOverlayBtnDisabled]}
              onPress={handleAddOverlay}
              disabled={!newText.trim()}
            >
              <Text style={styles.addOverlayBtnText}>Add to Video</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.cardBg,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  videoContainer: {
    marginHorizontal: 16,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
  },
  video: { width: '100%' as const, height: '100%' as const },
  segmentBadge: {
    position: 'absolute' as const, top: 12, right: 12,
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  segmentBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' as const },
  editorButtons: {
    position: 'absolute' as const, bottom: 12, left: 12,
    flexDirection: 'row' as const, gap: 8,
  },
  editorBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  editorBtnActive: {
    backgroundColor: 'rgba(34,197,94,0.25)',
    borderColor: '#22c55e',
  },
  editorBtnLabel: { color: '#FFF', fontSize: 13, fontWeight: '700' as const },
  editorBtnLabelActive: { color: '#22c55e' },
  captionsBadge: {
    position: 'absolute' as const, bottom: 12, right: 12,
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  captionsBadgeText: { color: '#22c55e', fontSize: 11, fontWeight: '600' as const },
  overlayHint: {
    fontSize: 12, color: colors.textSecondary,
    textAlign: 'center' as const, marginTop: 6, marginHorizontal: 16,
  },
  restaurantRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    gap: 8, paddingHorizontal: 16, marginTop: 16,
  },
  restaurantName: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  sectionLabel: {
    fontSize: 14, fontWeight: '600' as const, color: colors.textMuted,
    paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  tagsScroll: { maxHeight: 40 },
  tagsContainer: { flexDirection: 'row' as const, gap: 8, paddingHorizontal: 16 },
  tagChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.border,
  },
  tagChipSelected: { backgroundColor: `${colors.accent}20`, borderColor: colors.accent },
  tagChipText: { fontSize: 13, fontWeight: '500' as const, color: colors.textMuted },
  tagChipTextSelected: { color: colors.accent, fontWeight: '600' as const },
  captionContainer: {
    marginHorizontal: 16, backgroundColor: colors.cardBg,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  captionInput: { fontSize: 15, color: colors.text, minHeight: 48, textAlignVertical: 'top' as const },
  charCount: { fontSize: 12, color: colors.textSecondary, textAlign: 'right' as const, marginTop: 4 },
  consentText: {
    fontSize: 11, color: colors.textSecondary, textAlign: 'center' as const,
    marginBottom: 8, paddingHorizontal: 16, lineHeight: 15,
  },
  postButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: colors.accent, marginHorizontal: 16, marginTop: 24,
    paddingVertical: 16, borderRadius: radius.full, gap: 8,
  },
  postButtonDisabled: { opacity: 0.6 },
  postButtonText: { color: colors.textOnAccent, fontSize: 17, fontWeight: '700' as const },
  reRecordButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    marginTop: 16, gap: 6, padding: 12,
  },
  reRecordText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' as const },

  // ── Text editor modal ──
  modalBackdrop: {
    flex: 1, justifyContent: 'flex-end' as const,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  editorModal: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  editorModalHeader: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, marginBottom: 16,
  },
  editorModalTitle: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  overlayInput: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, color: colors.text, marginBottom: 20,
  },
  editorPickerLabel: {
    fontSize: 13, fontWeight: '600' as const, color: colors.textMuted, marginBottom: 10,
  },
  colorRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 20 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: colors.accent, transform: [{ scale: 1.15 }] },
  sizeRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 24 },
  sizeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center' as const,
  },
  sizeBtnSelected: { borderColor: colors.accent, backgroundColor: `${colors.accent}15` },
  sizeBtnText: { color: colors.textMuted, fontWeight: '700' as const },
  sizeBtnTextSelected: { color: colors.accent },
  addOverlayBtn: {
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingVertical: 14, alignItems: 'center' as const,
  },
  addOverlayBtnDisabled: { opacity: 0.4 },
  addOverlayBtnText: { color: colors.textOnAccent, fontSize: 16, fontWeight: '700' as const },
}));
