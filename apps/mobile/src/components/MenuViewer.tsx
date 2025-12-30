import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/colors';

interface MenuViewerProps {
  menuUrl: string | null;
  restaurantName: string;
}

export default function MenuViewer({ menuUrl, restaurantName }: MenuViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleOpenExternal = () => {
    if (menuUrl) {
      Linking.openURL(menuUrl);
    }
  };

  // No menu URL provided
  if (!menuUrl) {
    return (
      <View style={styles.placeholderContainer}>
        <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>Menu coming soon</Text>
        <Text style={styles.placeholderSubtext}>
          Check back later for the full menu
        </Text>
      </View>
    );
  }

  // Check if URL is a PDF (WebView handles PDFs differently on platforms)
  const isPdf = menuUrl.toLowerCase().endsWith('.pdf');

  // For PDFs on iOS/Android, offer to open externally
  if (isPdf && Platform.OS !== 'web') {
    return (
      <View style={styles.pdfContainer}>
        <Ionicons name="document-text-outline" size={48} color={colors.accent} />
        <Text style={styles.pdfTitle}>PDF Menu Available</Text>
        <Text style={styles.pdfSubtext}>
          Tap below to view {restaurantName}'s menu
        </Text>
        <TouchableOpacity style={styles.openButton} onPress={handleOpenExternal}>
          <Ionicons name="open-outline" size={20} color={colors.text} />
          <Text style={styles.openButtonText}>Open Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with external link option */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity style={styles.externalButton} onPress={handleOpenExternal}>
          <Ionicons name="open-outline" size={18} color={colors.accent} />
          <Text style={styles.externalText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.webviewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Loading menu...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color={colors.error} />
            <Text style={styles.errorText}>Unable to load menu</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setError(false)}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.openButton} onPress={handleOpenExternal}>
              <Text style={styles.openButtonText}>Open in Browser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            source={{ uri: menuUrl }}
            style={styles.webview}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            startInLoadingState
            scalesPageToFit
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  externalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  externalText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  webviewContainer: {
    flex: 1,
    minHeight: 350,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.cardBgElevated,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  retryText: {
    color: colors.accent,
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  pdfContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  pdfSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.full,
    marginTop: 12,
  },
  openButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
