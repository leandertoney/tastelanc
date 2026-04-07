import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'InAppBrowser'>;

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

export default function InAppBrowserScreen({ navigation, route }: Props) {
  const { url, title } = route.params;
  const normalizedUrl = normalizeUrl(url);
  const colors = getColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  const handleOpenExternal = useCallback(() => {
    Linking.openURL(normalizedUrl).catch(() => {});
  }, [normalizedUrl]);

  const displayTitle = title ?? extractDomain(normalizedUrl);

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayTitle}
          </Text>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleOpenExternal}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="open-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${loadProgress * 100}%` as any,
                opacity: isLoading ? 1 : 0,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>
      </View>

      {/* WebView */}
      <WebView
        source={{ uri: normalizedUrl }}
        style={styles.webView}
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
        onError={() => {
          setIsLoading(false);
          if (!autoOpened) {
            setAutoOpened(true);
            Linking.openURL(normalizedUrl).catch(() => {});
            navigation.goBack();
          }
        }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 400) {
            setHasError(true);
            setIsLoading(false);
          }
        }}
        startInLoadingState={false}
        javaScriptEnabled
        domStorageEnabled
      />

      {/* Loading Indicator */}
      {isLoading && !hasError && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      )}

      {/* Error Overlay */}
      {hasError && (
        <View style={[StyleSheet.absoluteFill, styles.errorOverlay]}>
          <Ionicons name="wifi-outline" size={56} color={colors.textSecondary} />
          <Text style={styles.errorTitle}>Page couldn't be loaded</Text>
          <Text style={styles.errorMessage}>
            This website may be unavailable or blocked.
          </Text>
          <TouchableOpacity
            style={styles.openExternalButton}
            onPress={handleOpenExternal}
            activeOpacity={0.7}
          >
            <Text style={styles.openExternalText}>Open in Browser</Text>
            <Ionicons name="open-outline" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  progressBarTrack: {
    height: 2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  progressBar: {
    height: 2,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorOverlay: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  openExternalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.cardBgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  openExternalText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
}));
