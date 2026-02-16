import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { withScreenErrorBoundary } from '../components/ErrorBoundary';
import BottomTabNavigator from './BottomTabNavigator';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import CategoryScreen from '../screens/CategoryScreen';
import HappyHoursViewAllScreen from '../screens/HappyHoursViewAllScreen';
import SpecialsViewAllScreen from '../screens/SpecialsViewAllScreen';
import EventsViewAllScreen from '../screens/EventsViewAllScreen';
import EntertainmentViewAllScreen from '../screens/EntertainmentViewAllScreen';
import FeaturedViewAllScreen from '../screens/FeaturedViewAllScreen';
import CuisinesViewAllScreen from '../screens/CuisinesViewAllScreen';
import CuisineDetailScreen from '../screens/CuisineDetailScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import FeatureRequestScreen from '../screens/FeatureRequestScreen';
import ItineraryBuilderScreen from '../screens/ItineraryBuilderScreen';
import BlogViewAllScreen from '../screens/BlogViewAllScreen';
import BlogDetailScreen from '../screens/BlogDetailScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import {
  VoteCenterScreen,
  VoteCategoryScreen,
  VoteRestaurantScreen,
  VoteHistoryScreen,
  VoteLeaderboardScreen,
} from '../screens/voting';
import { colors } from '../constants/colors';
import { BRAND } from '../config/brand';

// Wrap each screen so crashes show inline error instead of killing the app
const SafeRestaurantDetail = withScreenErrorBoundary(RestaurantDetailScreen, 'RestaurantDetail');
const SafeCategory = withScreenErrorBoundary(CategoryScreen, 'Category');
const SafeHappyHoursViewAll = withScreenErrorBoundary(HappyHoursViewAllScreen, 'HappyHoursViewAll');
const SafeSpecialsViewAll = withScreenErrorBoundary(SpecialsViewAllScreen, 'SpecialsViewAll');
const SafeEventsViewAll = withScreenErrorBoundary(EventsViewAllScreen, 'EventsViewAll');
const SafeEntertainmentViewAll = withScreenErrorBoundary(EntertainmentViewAllScreen, 'EntertainmentViewAll');
const SafeFeaturedViewAll = withScreenErrorBoundary(FeaturedViewAllScreen, 'FeaturedViewAll');
const SafeCuisinesViewAll = withScreenErrorBoundary(CuisinesViewAllScreen, 'CuisinesViewAll');
const SafeCuisineDetail = withScreenErrorBoundary(CuisineDetailScreen, 'CuisineDetail');
const SafeEventDetail = withScreenErrorBoundary(EventDetailScreen, 'EventDetail');
const SafeFeatureRequest = withScreenErrorBoundary(FeatureRequestScreen, 'FeatureRequest');
const SafeItineraryBuilder = withScreenErrorBoundary(ItineraryBuilderScreen, 'ItineraryBuilder');
const SafeBlogViewAll = withScreenErrorBoundary(BlogViewAllScreen, 'BlogViewAll');
const SafeBlogDetail = withScreenErrorBoundary(BlogDetailScreen, 'BlogDetail');
const SafeArtistDetail = withScreenErrorBoundary(ArtistDetailScreen, 'ArtistDetail');
const SafeVoteCenter = withScreenErrorBoundary(VoteCenterScreen, 'VoteCenter');
const SafeVoteCategory = withScreenErrorBoundary(VoteCategoryScreen, 'VoteCategory');
const SafeVoteRestaurant = withScreenErrorBoundary(VoteRestaurantScreen, 'VoteRestaurant');
const SafeVoteHistory = withScreenErrorBoundary(VoteHistoryScreen, 'VoteHistory');
const SafeVoteLeaderboard = withScreenErrorBoundary(VoteLeaderboardScreen, 'VoteLeaderboard');

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RestaurantDetail"
        component={SafeRestaurantDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Category"
        component={SafeCategory}
        options={{}}
      />
      {/* View All Screens */}
      <Stack.Screen
        name="HappyHoursViewAll"
        component={SafeHappyHoursViewAll}
        options={{ title: 'Happy Hours' }}
      />
      <Stack.Screen
        name="SpecialsViewAll"
        component={SafeSpecialsViewAll}
        options={{ title: 'Specials' }}
      />
      <Stack.Screen
        name="EventsViewAll"
        component={SafeEventsViewAll}
        options={{ title: 'Events' }}
      />
      <Stack.Screen
        name="EntertainmentViewAll"
        component={SafeEntertainmentViewAll}
        options={{ title: 'Entertainment' }}
      />
      <Stack.Screen
        name="FeaturedViewAll"
        component={SafeFeaturedViewAll}
        options={{ title: 'Featured' }}
      />
      <Stack.Screen
        name="CuisinesViewAll"
        component={SafeCuisinesViewAll}
        options={{ title: 'Cuisines' }}
      />
      <Stack.Screen
        name="CuisineDetail"
        component={SafeCuisineDetail}
        options={{ title: 'Cuisine' }}
      />
      <Stack.Screen
        name="EventDetail"
        component={SafeEventDetail}
        options={{
          title: 'Event',
          headerTransparent: true,
          headerTintColor: colors.text,
        }}
      />
      {/* Voting Screens */}
      <Stack.Screen
        name="VoteCenter"
        component={SafeVoteCenter}
        options={{ title: 'Vote Center' }}
      />
      <Stack.Screen
        name="VoteCategory"
        component={SafeVoteCategory}
        options={{ title: 'Categories' }}
      />
      <Stack.Screen
        name="VoteRestaurant"
        component={SafeVoteRestaurant}
        options={{ title: 'Vote' }}
      />
      <Stack.Screen
        name="VoteHistory"
        component={SafeVoteHistory}
        options={{ title: 'Vote History' }}
      />
      <Stack.Screen
        name="VoteLeaderboard"
        component={SafeVoteLeaderboard}
        options={{ title: 'Leaderboard' }}
      />
      {/* Feature Request */}
      <Stack.Screen
        name="FeatureRequest"
        component={SafeFeatureRequest}
        options={{ title: 'Suggest a Feature' }}
      />
      {/* Itinerary */}
      <Stack.Screen
        name="ItineraryBuilder"
        component={SafeItineraryBuilder}
        options={{ title: 'Plan Your Day' }}
      />
      {/* Blog */}
      <Stack.Screen
        name="BlogViewAll"
        component={SafeBlogViewAll}
        options={{ title: `${BRAND.aiName}'s Blog` }}
      />
      <Stack.Screen
        name="BlogDetail"
        component={SafeBlogDetail}
        options={{ title: 'Blog Post' }}
      />
      {/* Artist */}
      <Stack.Screen
        name="ArtistDetail"
        component={SafeArtistDetail}
        options={({ route }) => ({
          title: route.params.artistName,
        })}
      />
    </Stack.Navigator>
  );
}
