import React from 'react';

/**
 * Sentry stub — all functions are no-ops until @sentry/react-native is installed
 * via a native build. This file exists so other modules can import from it safely.
 * When ready to add Sentry: install the package, do a native build, and replace
 * these stubs with real implementations.
 */

export function initSentry() {
  // No-op until native build includes @sentry/react-native
}

export function reportError(error: Error, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error('[Sentry would report]:', error, context);
  }
}

export function setUserContext(_userId: string | null) {
  // No-op
}

export const Sentry = {
  wrap: <T extends React.ComponentType<any>>(component: T): T => component,
};
