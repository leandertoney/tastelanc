import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import type { BlogPost } from '../types/database';
import { useBlogPosts } from '../hooks';
import { colors, radius, spacing } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function BlogListItem({ post, onPress }: { post: BlogPost; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.8}>
      {post.cover_image_url ? (
        <Image source={{ uri: post.cover_image_url }} style={styles.itemImage} />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <Ionicons name="newspaper-outline" size={24} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.itemContent}>
        {post.tags && post.tags.length > 0 && (
          <Text style={styles.itemTag} numberOfLines={1}>
            {post.tags[0]}
          </Text>
        )}
        <Text style={styles.itemTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.itemSummary} numberOfLines={2}>
          {post.summary}
        </Text>
        <Text style={styles.itemDate}>By Rosie &middot; {formatDate(post.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BlogViewAllScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { data: posts = [], isLoading, isRefetching, refetch } = useBlogPosts(50);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['blog'] });
    refetch();
  }, [queryClient, refetch]);

  const handlePostPress = (post: BlogPost) => {
    navigation.navigate('BlogDetail', { slug: post.slug });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <BlogListItem post={item} onPress={() => handlePostPress(item)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blog posts yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  listContent: {
    padding: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  itemImage: {
    width: 110,
    height: 130,
    resizeMode: 'cover',
  },
  itemImagePlaceholder: {
    width: 110,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
  },
  itemContent: {
    flex: 1,
    padding: spacing.sm + 2,
    justifyContent: 'center',
  },
  itemTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  itemSummary: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: 6,
  },
  itemDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
