/**
 * NavigationActionsContext — provides app-level navigation actions to shared screens.
 * Each app wraps its tree with this provider and supplies its own implementations.
 */
import { createContext, useContext } from 'react';

export interface NavigationActions {
  restartOnboarding: () => void;
  finishOnboarding: () => void;
}

const NavigationActionsContext = createContext<NavigationActions | null>(null);

export const NavigationActionsProvider = NavigationActionsContext.Provider;

export function useNavigationActions(): NavigationActions {
  const context = useContext(NavigationActionsContext);
  if (!context) {
    // Return no-op defaults so shared screens don't crash if not wrapped
    return {
      restartOnboarding: () => {
        console.warn('[mobile-shared] restartOnboarding called but NavigationActionsProvider is missing');
      },
      finishOnboarding: () => {
        console.warn('[mobile-shared] finishOnboarding called but NavigationActionsProvider is missing');
      },
    };
  }
  return context;
}
