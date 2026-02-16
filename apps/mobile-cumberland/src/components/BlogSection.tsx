import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import BlogPostCard, { BLOG_CARD_WIDTH } from './BlogPostCard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { useLatestBlogPosts } from '../hooks';
import type { BlogPost } from '../types/database';
import { spacing } from '../constants/colors';
import { BRAND } from '../config/brand';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDE_PADDING = (SCREEN_WIDTH - BLOG_CARD_WIDTH) / 2;
const ITEM_SPACING = spacing.sm * 2;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BlogSection() {
  const navigation = useNavigation<NavigationProp>();
  const { data: posts = [], isError } = useLatestBlogPosts(5);

  if (isError || posts.length === 0) {
    return null;
  }

  const handlePostPress = (post: BlogPost) => {
    navigation.navigate('BlogDetail', { slug: post.slug });
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title={`From ${BRAND.aiName}'s Blog`}
        actionText="View All"
        onActionPress={() => navigation.navigate('BlogViewAll')}
      />
      <Spacer size="sm" />

      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <BlogPostCard post={item} onPress={() => handlePostPress(item)} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={BLOG_CARD_WIDTH + ITEM_SPACING}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingHorizontal: SIDE_PADDING,
    paddingVertical: spacing.sm,
  },
});
