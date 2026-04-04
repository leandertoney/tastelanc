/**
 * VideoRecommendPreviewScreen — final step before posting.
 * User arrives here from VideoEditorScreen with text overlays and caption data
 * already applied. This screen handles only: tag selection, written caption, and submit.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
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
import { trackClick } from '../lib/analytics';
import { useQueryClient } from '@tanstack/react-query';
import { ALL_CAPTION_TAGS, CAPTION_TAG_LABELS } from '../types/database';
import type { CaptionTag, TextOverlay, CaptionWord } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoRecommendPreview'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoRecommendPreviewScreen({ route, navigation }: Props) {
  const colors = getColors();
  const brand = getBrand();
  const styles = useStyles();
  const { userId, isAnonymous } = useAuth();
  const { market } = useMarket();
  const { showSignUpModal } = useSignUpModal();
  const queryClient = useQueryClient();

  const {
    clips,
    restaurantId,
    restaurantName,
    durationSeconds,
    textOverlays,
    captionWords,
    captionsEnabled,
  } = route.params as {
    clips: { uri: string; duration: number }[];
    restaurantId: string;
    restaurantName: string;
    durationSeconds: number;
    textOverlays?: TextOverlay[];
    captionWords?: CaptionWord[];
    captionsEnabled?: boolean;
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

  const [caption, setCaption] = useState('');
  const [selectedTag, setSelectedTag] = useState<CaptionTag | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const hasPosted = useRef(false);

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
        captionsEnabled: captionsEnabled ?? false,
        textOverlays: textOverlays && textOverlays.length > 0 ? textOverlays : undefined,
      });

      let pointsEarned = 0;
      try {
        const reward = await earnPoints({ action_type: 'video_recommendation', restaurant_id: restaurantId, radar_verified: false });
        pointsEarned = reward.points_earned;
      } catch {}

      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.byRestaurant(restaurantId) });
      trackClick('video_recommendation_submitted', restaurantId);

      hasPosted.current = true;
      const pointsMsg = pointsEarned > 0 ? ` You earned ${pointsEarned} points!` : '';
      Alert.alert(
        'Recommendation Submitted!',
        `Your recommendation for ${restaurantName} is being reviewed and will be live shortly.${pointsMsg}`,
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

        {/* Video preview — non-interactive, shows what they edited */}
        <View style={styles.videoContainer}>
          <VideoView player={previewPlayer} style={styles.video} contentFit="cover" nativeControls={false} />
          {clips.length > 1 && (
            <View style={styles.segmentBadge}>
              <Ionicons name="layers-outline" size={14} color="#FFF" />
              <Text style={styles.segmentBadgeText}>{clips.length} clips</Text>
            </View>
          )}
          {captionsEnabled && (
            <View style={styles.captionsBadge}>
              <Ionicons name="closed-captioning" size={12} color="#22c55e" />
              <Text style={styles.captionsBadgeText}>Captions on</Text>
            </View>
          )}
          {textOverlays && textOverlays.length > 0 && (
            <View style={styles.overlaysBadge}>
              <Ionicons name="text" size={12} color="#FFF" />
              <Text style={styles.overlaysBadgeText}>{textOverlays.length} text overlay{textOverlays.length > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

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

        <Text style={styles.consentText}>
          By posting, you grant {brand.appName} permission to feature your recommendation.
        </Text>

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

        <TouchableOpacity style={styles.reRecordButton} onPress={() => navigation.goBack()} disabled={isPosting}>
          <Ionicons name="create-outline" size={18} color={colors.textMuted} />
          <Text style={styles.reRecordText}>Back to editor</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.cardBg,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  videoContainer: {
    marginHorizontal: 16, borderRadius: radius.md,
    overflow: 'hidden' as const, height: 320, backgroundColor: '#000',
  },
  video: { width: '100%' as const, height: '100%' as const },
  segmentBadge: {
    position: 'absolute' as const, top: 12, right: 12,
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  segmentBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' as const },
  captionsBadge: {
    position: 'absolute' as const, bottom: 12, left: 12,
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 8,
  },
  captionsBadgeText: { color: '#22c55e', fontSize: 11, fontWeight: '600' as const },
  overlaysBadge: {
    position: 'absolute' as const, bottom: 12, right: 12,
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 8,
  },
  overlaysBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' as const },
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
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border,
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
}));
