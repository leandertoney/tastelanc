import React, { Component, ErrorInfo, ReactNode, ComponentType } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'screen' | 'section' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'screen' } = this.props;

      // Different fallback UIs based on level
      if (level === 'component') {
        return <ComponentErrorFallback onRetry={this.handleRetry} />;
      }

      if (level === 'section') {
        return (
          <SectionErrorFallback
            onRetry={this.handleRetry}
            error={this.state.error}
          />
        );
      }

      // Full screen fallback
      return (
        <ScreenErrorFallback
          onRetry={this.handleRetry}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

// Minimal fallback for small components
function ComponentErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <TouchableOpacity style={styles.componentError} onPress={onRetry}>
      <Ionicons name="alert-circle-outline" size={20} color="#888" />
      <Text style={styles.componentErrorText}>Tap to retry</Text>
    </TouchableOpacity>
  );
}

// Medium fallback for sections
function SectionErrorFallback({
  onRetry,
  error,
}: {
  onRetry: () => void;
  error: Error | null;
}) {
  return (
    <View style={styles.sectionError}>
      <Ionicons name="warning-outline" size={32} color={colors.error} />
      <Text style={styles.sectionErrorTitle}>Something went wrong</Text>
      <Text style={styles.sectionErrorMessage}>
        {error?.message || 'Failed to load this section'}
      </Text>
      <TouchableOpacity style={styles.sectionRetryButton} onPress={onRetry}>
        <Ionicons name="refresh-outline" size={16} color="#FFF" />
        <Text style={styles.sectionRetryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// Full screen fallback
function ScreenErrorFallback({
  onRetry,
  error,
  errorInfo,
}: {
  onRetry: () => void;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}) {
  const [showDetails, setShowDetails] = React.useState(false);

  // Show friendly maintenance message in production
  if (!__DEV__) {
    return (
      <View style={styles.screenError}>
        <View style={styles.screenErrorContent}>
          <View style={styles.maintenanceIconContainer}>
            <Ionicons name="construct-outline" size={64} color={colors.accent} />
          </View>

          <Text style={styles.screenErrorTitle}>We'll Be Right Back</Text>
          <Text style={styles.maintenanceMessage}>
            We're making some improvements to give you a better experience. Please check back shortly!
          </Text>

          <TouchableOpacity style={styles.screenRetryButton} onPress={onRetry}>
            <Ionicons name="refresh-outline" size={20} color="#FFF" />
            <Text style={styles.screenRetryText}>Try Again</Text>
          </TouchableOpacity>

          <Text style={styles.maintenanceNote}>
            If this persists, try closing and reopening the app.
          </Text>
        </View>
      </View>
    );
  }

  // Development mode - show full error details
  return (
    <View style={styles.screenError}>
      <View style={styles.screenErrorContent}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="sad-outline" size={64} color={colors.primary} />
        </View>

        <Text style={styles.screenErrorTitle}>Oops!</Text>
        <Text style={styles.screenErrorSubtitle}>
          Something unexpected happened
        </Text>
        <Text style={styles.screenErrorMessage}>
          {error?.message || 'An unknown error occurred'}
        </Text>

        {/* Always show error name for debugging */}
        <Text style={styles.errorDebug}>
          {error?.name}: {error?.message?.substring(0, 100)}
        </Text>

        <TouchableOpacity style={styles.screenRetryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={20} color="#FFF" />
          <Text style={styles.screenRetryText}>Try Again</Text>
        </TouchableOpacity>

        {errorInfo && (
          <>
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#666"
              />
            </TouchableOpacity>

            {showDetails && (
              <ScrollView style={styles.detailsContainer}>
                <Text style={styles.detailsText}>
                  {error?.stack || 'No stack trace available'}
                </Text>
                <Text style={styles.detailsText}>
                  {errorInfo.componentStack}
                </Text>
              </ScrollView>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Component level error
  componentError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
  },
  componentErrorText: {
    fontSize: 13,
    color: '#888',
  },

  // Section level error
  sectionError: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionErrorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 4,
  },
  sectionErrorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  sectionRetryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Screen level error
  screenError: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  screenErrorContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(164, 30, 34, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  maintenanceIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  maintenanceMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  maintenanceNote: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  screenErrorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  screenErrorSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  screenErrorMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  errorDebug: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  screenRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  screenRetryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  detailsToggleText: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    marginTop: 12,
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  detailsText: {
    fontSize: 11,
    color: '#ddd',
    fontFamily: 'monospace',
  },
});

/**
 * HOC to wrap any screen component with a screen-level error boundary.
 * If the screen crashes, it shows an inline error with retry instead of
 * letting it bubble up to the root error boundary ("We'll Be Right Back").
 */
export function withScreenErrorBoundary<P extends object>(
  ScreenComponent: ComponentType<P>,
  displayName?: string
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary level="screen">
      <ScreenComponent {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `WithErrorBoundary(${displayName || ScreenComponent.displayName || ScreenComponent.name || 'Screen'})`;
  return Wrapped;
}
