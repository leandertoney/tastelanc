import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import { supabase } from '../lib/supabase';

type BlogDetailRouteProp = RouteProp<RootStackParamList, 'BlogDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SITE_URL = 'https://tastelanc.com';

// JS injected into the WebView to hide web chrome for in-app experience
const INJECTED_JS = `
(function() {
  // Hide web header/nav and footer
  var header = document.querySelector('header');
  var nav = document.querySelector('nav');
  var footer = document.querySelector('footer');
  if (header) header.style.display = 'none';
  if (nav) nav.style.display = 'none';
  if (footer) footer.style.display = 'none';

  // Hide back-to-blog links
  var backLinks = document.querySelectorAll('a[href="/blog"]');
  backLinks.forEach(function(el) { el.style.display = 'none'; });

  // Hide download CTAs since user is already in the app
  var downloadEls = document.querySelectorAll('[href*="apps.apple.com"], [href*="play.google.com"]');
  downloadEls.forEach(function(el) {
    var parent = el.closest('div, section');
    if (parent) parent.style.display = 'none';
  });
})();
true;
`;

export default function BlogDetailScreen() {
  const route = useRoute<BlogDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { slug } = route.params;
  const url = `${SITE_URL}/blog/${slug}`;

  const navigateToRestaurant = async (restaurantSlug: string) => {
    const { data } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', restaurantSlug)
      .single();

    if (data) {
      navigation.navigate('RestaurantDetail', { id: data.id });
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        injectedJavaScript={INJECTED_JS}
        onShouldStartLoadWithRequest={(request) => {
          // Intercept restaurant links to navigate natively
          const match = request.url.match(/tastelanc\.com\/restaurants\/([^/?#]+)/);
          if (match) {
            navigateToRestaurant(match[1]);
            return false;
          }
          // Allow the blog page and external links
          return true;
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
        allowsBackForwardNavigationGestures={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
});
