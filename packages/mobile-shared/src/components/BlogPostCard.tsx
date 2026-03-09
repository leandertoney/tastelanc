import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BlogPost } from '../types/database';
import { getColors } from '../config/theme';
import { getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const BLOG_CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = BLOG_CARD_WIDTH * 0.75;

interface BlogPostCardProps {
  post: BlogPost;
  onPress: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BlogPostCard({ post, onPress }: BlogPostCardProps) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const displayTags = post.tags?.slice(0, 2) || [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        {post.cover_image_url ? (
          <Image source={{ uri: post.cover_image_url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="newspaper-outline" size={40} color={colors.textSecondary} />
          </View>
        )}

        {/* Content at bottom */}
        <View style={styles.contentOverlay}>
          {displayTags.length > 0 && (
            <View style={styles.tagsRow}>
              {displayTags.map((tag) => (
                <View key={tag} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.title} numberOfLines={2}>
            {post.title}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>By {brand.aiName}</Text>
            <Text style={styles.metaDot}>&middot;</Text>
            <Text style={styles.metaText}>{formatDate(post.published_at || post.created_at)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles((colors) => ({
  card: {
    width: BLOG_CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  imageContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  image: {
    width: '100%' as const,
    height: '100%' as const,
    resizeMode: 'cover' as const,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.cardBgElevated,
  },
  contentOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  tagsRow: {
    flexDirection: 'row' as const,
    gap: 6,
    marginBottom: spacing.xs,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700' as const,
    textTransform: 'capitalize' as const,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
}));
