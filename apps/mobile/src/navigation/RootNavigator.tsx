import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import BottomTabNavigator from './BottomTabNavigator';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import CategoryScreen from '../screens/CategoryScreen';
import HappyHoursViewAllScreen from '../screens/HappyHoursViewAllScreen';
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
import {
  VoteCenterScreen,
  VoteCategoryScreen,
  VoteRestaurantScreen,
  VoteHistoryScreen,
  VoteLeaderboardScreen,
} from '../screens/voting';
import { colors } from '../constants/colors';

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
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Category"
        component={CategoryScreen}
        options={{
          headerBackTitle: 'Back',
        }}
      />
      {/* View All Screens */}
      <Stack.Screen
        name="HappyHoursViewAll"
        component={HappyHoursViewAllScreen}
        options={{ title: 'Happy Hours' }}
      />
      <Stack.Screen
        name="EventsViewAll"
        component={EventsViewAllScreen}
        options={{ title: 'Events' }}
      />
      <Stack.Screen
        name="EntertainmentViewAll"
        component={EntertainmentViewAllScreen}
        options={{ title: 'Entertainment' }}
      />
      <Stack.Screen
        name="FeaturedViewAll"
        component={FeaturedViewAllScreen}
        options={{ title: 'Featured' }}
      />
      <Stack.Screen
        name="CuisinesViewAll"
        component={CuisinesViewAllScreen}
        options={{ title: 'Cuisines' }}
      />
      <Stack.Screen
        name="CuisineDetail"
        component={CuisineDetailScreen}
        options={{ title: 'Cuisine' }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{
          title: 'Event',
          headerBackTitle: 'Back',
          headerTransparent: true,
          headerTintColor: colors.text,
        }}
      />
      {/* Voting Screens */}
      <Stack.Screen
        name="VoteCenter"
        component={VoteCenterScreen}
        options={{ title: 'Vote Center' }}
      />
      <Stack.Screen
        name="VoteCategory"
        component={VoteCategoryScreen}
        options={{ title: 'Categories' }}
      />
      <Stack.Screen
        name="VoteRestaurant"
        component={VoteRestaurantScreen}
        options={{ title: 'Vote' }}
      />
      <Stack.Screen
        name="VoteHistory"
        component={VoteHistoryScreen}
        options={{ title: 'Vote History' }}
      />
      <Stack.Screen
        name="VoteLeaderboard"
        component={VoteLeaderboardScreen}
        options={{ title: 'Leaderboard' }}
      />
      {/* Feature Request */}
      <Stack.Screen
        name="FeatureRequest"
        component={FeatureRequestScreen}
        options={{ title: 'Suggest a Feature' }}
      />
      {/* Itinerary */}
      <Stack.Screen
        name="ItineraryBuilder"
        component={ItineraryBuilderScreen}
        options={{ title: 'Plan Your Day' }}
      />
      {/* Blog */}
      <Stack.Screen
        name="BlogViewAll"
        component={BlogViewAllScreen}
        options={{ title: "Rosie's Blog" }}
      />
      <Stack.Screen
        name="BlogDetail"
        component={BlogDetailScreen}
        options={{
          title: 'Blog Post',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}
