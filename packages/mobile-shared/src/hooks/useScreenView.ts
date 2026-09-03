import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { trackScreenView } from '../lib/analytics';

/**
 * Log a screen view every time the screen gains focus (tab switch, back
 * navigation), not just on mount. Use for the main tabs and list screens,
 * which stay mounted for the life of the app.
 */
export function useScreenView(screenName: string) {
  useFocusEffect(
    useCallback(() => {
      trackScreenView(screenName);
    }, [screenName])
  );
}
