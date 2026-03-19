import { View, Text, TouchableOpacity, Linking, Platform, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { getColors, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import { trackClick } from '../lib/analytics';

interface QuickActionsBarProps {
  restaurantId?: string;
  restaurantName?: string;
  phone?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  onWebsitePress?: (url: string) => void;
}

export default function QuickActionsBar({
  restaurantId,
  restaurantName,
  phone,
  website,
  latitude,
  longitude,
  address,
  onFavoritePress,
  isFavorite = false,
  onWebsitePress,
}: QuickActionsBarProps) {
  const colors = getColors();
  const brand = getBrand();
  const styles = useStyles();

  const handleCall = () => {
    if (phone) {
      trackClick('phone', restaurantId);
      const phoneUrl = `tel:${phone.replace(/[^0-9+]/g, '')}`;
      Linking.openURL(phoneUrl);
    }
  };

  const handleWebsite = async () => {
    if (website) {
      trackClick('website', restaurantId);
      let url = website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      if (onWebsitePress) {
        onWebsitePress(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    }
  };

  const handleDirections = () => {
    trackClick('directions', restaurantId);
    if (latitude && longitude) {
      const url = Platform.select({
        ios: `maps:?daddr=${latitude},${longitude}`,
        android: `google.navigation:q=${latitude},${longitude}`,
        default: `https://maps.google.com/maps?daddr=${latitude},${longitude}`,
      });
      Linking.openURL(url);
    } else if (address) {
      const encodedAddress = encodeURIComponent(address);
      const url = Platform.select({
        ios: `maps:?daddr=${encodedAddress}`,
        android: `google.navigation:q=${encodedAddress}`,
        default: `https://maps.google.com/maps?daddr=${encodedAddress}`,
      });
      Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    trackClick('share', restaurantId);
    const appStoreUrl = brand.appStoreUrl || brand.playStoreUrl || '';

    try {
      await Share.share({
        message: restaurantName
          ? `Check out ${restaurantName} on ${brand.appName}! Download the app: ${appStoreUrl}`
          : `Check out this restaurant on ${brand.appName}! Download the app: ${appStoreUrl}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleFavorite = () => {
    trackClick('favorite', restaurantId);
    if (onFavoritePress) {
      onFavoritePress();
    }
  };

  const actions = [
    {
      icon: 'call-outline' as const,
      label: 'Call',
      onPress: handleCall,
      disabled: !phone,
    },
    {
      icon: 'globe-outline' as const,
      label: 'Website',
      onPress: handleWebsite,
      disabled: !website,
    },
    {
      icon: 'navigate-outline' as const,
      label: 'Directions',
      onPress: handleDirections,
      disabled: !latitude && !longitude && !address,
    },
    {
      icon: isFavorite ? 'heart' : 'heart-outline',
      label: 'Favorite',
      onPress: handleFavorite,
      disabled: false,
      iconColor: isFavorite ? colors.accent : undefined,
    },
    {
      icon: 'share-outline' as const,
      label: 'Share',
      onPress: handleShare,
      disabled: false,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={[styles.actionButton, action.disabled && styles.disabled]}
          onPress={action.onPress}
          disabled={action.disabled}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name={action.icon as any}
              size={24}
              color={action.disabled ? colors.textSecondary : action.iconColor || colors.text}
            />
          </View>
          <Text style={[styles.label, action.disabled && styles.disabledText]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.textSecondary,
  },
}));
