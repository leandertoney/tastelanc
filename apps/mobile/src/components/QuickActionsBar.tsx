import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors, radius } from '../constants/colors';

interface QuickActionsBarProps {
  phone?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
}

export default function QuickActionsBar({
  phone,
  website,
  latitude,
  longitude,
  address,
  onFavoritePress,
  isFavorite = false,
}: QuickActionsBarProps) {
  const handleCall = () => {
    if (phone) {
      const phoneUrl = `tel:${phone.replace(/[^0-9+]/g, '')}`;
      Linking.openURL(phoneUrl);
    }
  };

  const handleWebsite = async () => {
    if (website) {
      let url = website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      await WebBrowser.openBrowserAsync(url);
    }
  };

  const handleDirections = () => {
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
    // Placeholder for share functionality
    // Will implement with expo-sharing later
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
      onPress: onFavoritePress,
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

const styles = StyleSheet.create({
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
});
