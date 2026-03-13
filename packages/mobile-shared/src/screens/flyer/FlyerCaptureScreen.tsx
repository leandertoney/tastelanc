import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { withAlpha } from '../../utils/colorUtils';
import { spacing, radius, typography } from '../../constants/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FlyerCapture'>;

const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  allowsEditing: true,
  exif: false,
};

export default function FlyerCaptureScreen() {
  const navigation = useNavigation<Nav>();
  const styles = useStyles();
  const colors = getColors();

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to scan event flyers.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync(IMAGE_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      navigation.navigate('FlyerProcessing', { imageUri: result.assets[0].uri });
    }
  };

  const handleUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to upload event flyers.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      navigation.navigate('FlyerProcessing', { imageUri: result.assets[0].uri });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Scan Event Flyer</Text>
        <Text style={styles.subtitle}>
          Capture or upload a photo of an event flyer to create an event listing.
        </Text>

        <View style={styles.cards}>
          <TouchableOpacity style={styles.card} onPress={handleTakePhoto} activeOpacity={0.7}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={40} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle}>Take Photo</Text>
            <Text style={styles.cardDesc}>Open camera to capture a flyer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={handleUploadImage} activeOpacity={0.7}>
            <View style={styles.iconCircle}>
              <Ionicons name="image-outline" size={40} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle}>Upload Image</Text>
            <Text style={styles.cardDesc}>Select a flyer from your photos</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: typography.title1,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: typography.callout,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  cards: {
    flex: 1,
    justifyContent: 'center' as const,
    gap: spacing.lg,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: withAlpha(colors.accent, 0.1),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.headline,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    fontSize: typography.subhead,
    color: colors.textMuted,
  },
}));
