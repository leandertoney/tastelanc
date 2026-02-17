import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BlogPost } from '../types/database';
import { colors, radius, spacing } from '../constants/colors';

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

        {/* Gradient overlay */}
        <View style={styles.gradientOverlay} />

        {/* Content overlay at bottom */}
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
            <Text style={styles.metaText}>By Rosie</Text>
            <Text style={styles.metaDot}>&middot;</Text>
            <Text style={styles.metaText}>{formatDate(post.published_at || post.created_at)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: BLOG_CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xs,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tagText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
