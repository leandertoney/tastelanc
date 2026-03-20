import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { getBrand } from '../config/theme';
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
import ItineraryCardScreen from '../screens/ItineraryCardScreen';
import MyRestaurantsScreen from '../screens/MyRestaurantsScreen';
import WishlistScreen from '../screens/WishlistScreen';
import BlogViewAllScreen from '../screens/BlogViewAllScreen';
import BlogDetailScreen from '../screens/BlogDetailScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import FlyerCaptureScreen from '../screens/flyer/FlyerCaptureScreen';
import FlyerProcessingScreen from '../screens/flyer/FlyerProcessingScreen';
import FlyerPreviewScreen from '../screens/flyer/FlyerPreviewScreen';
import FlyerPublishChoiceScreen from '../screens/flyer/FlyerPublishChoiceScreen';
import FlyerSuccessScreen from '../screens/flyer/FlyerSuccessScreen';
import VideoRecommendCaptureScreen from '../screens/VideoRecommendCaptureScreen';
import VideoEditorScreen from '../screens/VideoEditorScreen';
import VideoRecommendPreviewScreen from '../screens/VideoRecommendPreviewScreen';
import SalesDashboardScreen from '../screens/sales/SalesDashboardScreen';
import EmailThreadScreen from '../screens/sales/EmailThreadScreen';
import ComposeEmailScreen from '../screens/sales/ComposeEmailScreen';
import LeadDetailScreen from '../screens/sales/LeadDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import InAppBrowserScreen from '../screens/InAppBrowserScreen';
import StPatricksDayScreen from '../screens/StPatricksDayScreen';
import RestaurantWeekScreen from '../screens/RestaurantWeekScreen';
import PartyRSVPScreen from '../screens/PartyRSVPScreen';
import PartyTicketScreen from '../screens/PartyTicketScreen';
import CouponsViewAllScreen from '../screens/CouponsViewAllScreen';
import MyCouponsScreen from '../screens/MyCouponsScreen';

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
const SafeItineraryCard = withScreenErrorBoundary(ItineraryCardScreen, 'ItineraryCard');
const SafeMyRestaurants = withScreenErrorBoundary(MyRestaurantsScreen, 'MyRestaurants');
const SafeWishlist = withScreenErrorBoundary(WishlistScreen, 'Wishlist');
const SafeBlogViewAll = withScreenErrorBoundary(BlogViewAllScreen, 'BlogViewAll');
const SafeBlogDetail = withScreenErrorBoundary(BlogDetailScreen, 'BlogDetail');
const SafeArtistDetail = withScreenErrorBoundary(ArtistDetailScreen, 'ArtistDetail');
const SafeFlyerCapture = withScreenErrorBoundary(FlyerCaptureScreen, 'FlyerCapture');
const SafeFlyerProcessing = withScreenErrorBoundary(FlyerProcessingScreen, 'FlyerProcessing');
const SafeFlyerPreview = withScreenErrorBoundary(FlyerPreviewScreen, 'FlyerPreview');
const SafeFlyerPublishChoice = withScreenErrorBoundary(FlyerPublishChoiceScreen, 'FlyerPublishChoice');
const SafeFlyerSuccess = withScreenErrorBoundary(FlyerSuccessScreen, 'FlyerSuccess');
const SafeVideoRecommendCapture = withScreenErrorBoundary(VideoRecommendCaptureScreen, 'VideoRecommendCapture');
const SafeVideoEditor = withScreenErrorBoundary(VideoEditorScreen, 'VideoEditor');
const SafeVideoRecommendPreview = withScreenErrorBoundary(VideoRecommendPreviewScreen, 'VideoRecommendPreview');
const SafeSalesDashboard = withScreenErrorBoundary(SalesDashboardScreen, 'SalesDashboard');
const SafeEmailThread = withScreenErrorBoundary(EmailThreadScreen, 'EmailThread');
const SafeComposeEmail = withScreenErrorBoundary(ComposeEmailScreen, 'ComposeEmail');
const SafeLeadDetail = withScreenErrorBoundary(LeadDetailScreen, 'LeadDetail');
const SafeSettings = withScreenErrorBoundary(SettingsScreen, 'Settings');
const SafeInAppBrowser = withScreenErrorBoundary(InAppBrowserScreen, 'InAppBrowser');
const SafeStPatricksDay = withScreenErrorBoundary(StPatricksDayScreen, 'StPatricksDay');
const SafeRestaurantWeek = withScreenErrorBoundary(RestaurantWeekScreen, 'RestaurantWeek');
const SafePartyRSVP = withScreenErrorBoundary(PartyRSVPScreen, 'PartyRSVP');
const SafePartyTicket = withScreenErrorBoundary(PartyTicketScreen, 'PartyTicket');
const SafeCouponsViewAll = withScreenErrorBoundary(CouponsViewAllScreen, 'CouponsViewAll');
const SafeMyCoupons = withScreenErrorBoundary(MyCouponsScreen, 'MyCoupons');

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const brand = getBrand();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleStyle: {
          fontWeight: '600' as const,
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
        name="CouponsViewAll"
        component={SafeCouponsViewAll}
        options={{ title: 'Coupons' }}
      />
      <Stack.Screen
        name="MyCoupons"
        component={SafeMyCoupons}
        options={{ title: 'My Coupons' }}
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
        }}
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
      <Stack.Screen
        name="ItineraryCard"
        component={SafeItineraryCard}
        options={{ headerShown: false }}
      />
      {/* Blog */}
      <Stack.Screen
        name="BlogViewAll"
        component={SafeBlogViewAll}
        options={{ title: `${brand.aiName}'s Blog` }}
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
      {/* Personal History */}
      <Stack.Screen
        name="MyRestaurants"
        component={SafeMyRestaurants}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Wishlist"
        component={SafeWishlist}
        options={{ headerShown: false }}
      />
      {/* Flyer Scanner */}
      <Stack.Screen
        name="FlyerCapture"
        component={SafeFlyerCapture}
        options={{ title: 'Scan Flyer' }}
      />
      <Stack.Screen
        name="FlyerProcessing"
        component={SafeFlyerProcessing}
        options={{ title: 'Analyzing Flyer' }}
      />
      <Stack.Screen
        name="FlyerPreview"
        component={SafeFlyerPreview}
        options={{ title: 'Review Event' }}
      />
      <Stack.Screen
        name="FlyerPublishChoice"
        component={SafeFlyerPublishChoice}
        options={{ title: 'Publish Event' }}
      />
      <Stack.Screen
        name="FlyerSuccess"
        component={SafeFlyerSuccess}
        options={{ headerShown: false }}
      />
      {/* Video Recommendations */}
      <Stack.Screen
        name="VideoRecommendCapture"
        component={SafeVideoRecommendCapture}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VideoEditor"
        component={SafeVideoEditor}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VideoRecommendPreview"
        component={SafeVideoRecommendPreview}
        options={{ headerShown: false }}
      />
      {/* Holiday / Seasonal */}
      <Stack.Screen
        name="StPatricksDay"
        component={SafeStPatricksDay}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RestaurantWeek"
        component={SafeRestaurantWeek}
        options={{ headerShown: false }}
      />
      {/* Party RSVP */}
      <Stack.Screen
        name="PartyRSVP"
        component={SafePartyRSVP}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PartyTicket"
        component={SafePartyTicket}
        options={{ headerShown: false }}
      />
      {/* Settings */}
      <Stack.Screen
        name="Settings"
        component={SafeSettings}
        options={{ title: 'Settings' }}
      />
      {/* In-App Browser */}
      <Stack.Screen
        name="InAppBrowser"
        component={SafeInAppBrowser}
        options={{ headerShown: false }}
      />
      {/* Sales CRM */}
      <Stack.Screen
        name="SalesDashboard"
        component={SafeSalesDashboard}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EmailThread"
        component={SafeEmailThread}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ComposeEmail"
        component={SafeComposeEmail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LeadDetail"
        component={SafeLeadDetail}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
