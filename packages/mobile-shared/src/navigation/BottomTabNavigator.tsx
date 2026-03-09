import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabParamList, RootStackParamList } from './types';
import { getColors } from '../config/theme';
import HeaderLogo from '../components/HeaderLogo';
import HeaderGreeting from '../components/HeaderGreeting';
import { withScreenErrorBoundary } from '../components/ErrorBoundary';
import { useSalesRole } from '../hooks/useSalesRole';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import PulseScreen from '../screens/PulseScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SalesDashboardScreen from '../screens/sales/SalesDashboardScreen';

// Wrap each tab screen so crashes show inline error instead of killing the app
const SafeHomeScreen = withScreenErrorBoundary(HomeScreen, 'HomeScreen');
const SafeSearchScreen = withScreenErrorBoundary(SearchScreen, 'SearchScreen');
const SafeFavoritesScreen = withScreenErrorBoundary(FavoritesScreen, 'FavoritesScreen');
const SafePulseScreen = withScreenErrorBoundary(PulseScreen, 'PulseScreen');
const SafeProfileScreen = withScreenErrorBoundary(ProfileScreen, 'ProfileScreen');
const SafeSalesDashboard = withScreenErrorBoundary(SalesDashboardScreen, 'SalesDashboard');

const Tab = createBottomTabNavigator<BottomTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const getTabIcon = (routeName: keyof BottomTabParamList, focused: boolean): IconName => {
  const icons: Record<keyof BottomTabParamList, { active: IconName; inactive: IconName }> = {
    Home: { active: 'home', inactive: 'home-outline' },
    Search: { active: 'search', inactive: 'search-outline' },
    Favorites: { active: 'heart', inactive: 'heart-outline' },
    Pulse: { active: 'pulse', inactive: 'pulse-outline' },
    Profile: { active: 'person', inactive: 'person-outline' },
    Sales: { active: 'briefcase', inactive: 'briefcase-outline' },
  };

  return focused ? icons[routeName].active : icons[routeName].inactive;
};

function ProfileHeaderRight() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = getColors();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Settings')}
      style={{ marginRight: 16 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="settings-outline" size={22} color={colors.text} />
    </TouchableOpacity>
  );
}

export default function BottomTabNavigator() {
  const colors = getColors();
  const { isSalesRep } = useSalesRole();

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
          fontWeight: '600' as const,
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
        name="Pulse"
        component={SafePulseScreen}
        options={{ title: 'Pulse' }}
      />
      <Tab.Screen
        name="Favorites"
        component={SafeFavoritesScreen}
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen
        name="Profile"
        component={SafeProfileScreen}
        options={{
          title: 'Profile',
          headerRight: () => <ProfileHeaderRight />,
        }}
      />
      {isSalesRep && (
        <Tab.Screen
          name="Sales"
          component={SafeSalesDashboard}
          options={{ title: 'Sales', headerShown: false }}
        />
      )}
    </Tab.Navigator>
  );
}
