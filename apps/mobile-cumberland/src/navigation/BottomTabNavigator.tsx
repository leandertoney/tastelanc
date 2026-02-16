import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabParamList } from './types';
import { colors } from '../constants/colors';
import HeaderLogo from '../components/HeaderLogo';
import HeaderGreeting from '../components/HeaderGreeting';
import { withScreenErrorBoundary } from '../components/ErrorBoundary';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import RewardsScreen from '../screens/RewardsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Wrap each tab screen so crashes show inline error instead of killing the app
const SafeHomeScreen = withScreenErrorBoundary(HomeScreen, 'HomeScreen');
const SafeSearchScreen = withScreenErrorBoundary(SearchScreen, 'SearchScreen');
const SafeFavoritesScreen = withScreenErrorBoundary(FavoritesScreen, 'FavoritesScreen');
const SafeRewardsScreen = withScreenErrorBoundary(RewardsScreen, 'RewardsScreen');
const SafeProfileScreen = withScreenErrorBoundary(ProfileScreen, 'ProfileScreen');

const Tab = createBottomTabNavigator<BottomTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const getTabIcon = (routeName: keyof BottomTabParamList, focused: boolean): IconName => {
  const icons: Record<keyof BottomTabParamList, { active: IconName; inactive: IconName }> = {
    Home: { active: 'home', inactive: 'home-outline' },
    Search: { active: 'search', inactive: 'search-outline' },
    Favorites: { active: 'heart', inactive: 'heart-outline' },
    Rewards: { active: 'gift', inactive: 'gift-outline' },
    Profile: { active: 'person', inactive: 'person-outline' },
  };

  return focused ? icons[routeName].active : icons[routeName].inactive;
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
        },
        headerShown: true,
        headerLeft: () => <HeaderLogo />,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={SafeHomeScreen}
        options={{
          headerTitle: () => <HeaderLogo />,
          headerLeft: () => <HeaderGreeting />,
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SafeSearchScreen}
        options={{ headerShown: false, title: 'Search' }}
      />
      <Tab.Screen
        name="Favorites"
        component={SafeFavoritesScreen}
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen
        name="Rewards"
        component={SafeRewardsScreen}
        options={{ title: 'Rewards' }}
      />
      <Tab.Screen
        name="Profile"
        component={SafeProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
