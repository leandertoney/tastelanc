/**
 * Minimal crash logger — persists the last JS error to AsyncStorage
 * so it can be retrieved on the next successful launch for debugging.
 *
 * Since Sentry is not yet installed in the native build, this is the
 * only way to capture production crash details.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CRASH_KEY = '@tastelanc_last_crash';
const MAX_STACK_LENGTH = 2000;

interface CrashEntry {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  source: string;
}

/**
 * Save a crash to AsyncStorage. Fire-and-forget — never throws.
 */
export function saveCrash(error: unknown, source: string, componentStack?: string) {
  try {
    const entry: CrashEntry = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, MAX_STACK_LENGTH) : undefined,
      componentStack: componentStack?.slice(0, MAX_STACK_LENGTH),
      timestamp: new Date().toISOString(),
      source,
    };
    // Fire-and-forget — don't await
    AsyncStorage.setItem(CRASH_KEY, JSON.stringify(entry)).catch(() => {});
  } catch {
    // Never crash the crash logger
  }
}

/**
 * Retrieve and clear the last saved crash (call on successful launch).
 */
export async function getAndClearLastCrash(): Promise<CrashEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CRASH_KEY);
    if (raw) {
      await AsyncStorage.removeItem(CRASH_KEY);
      return JSON.parse(raw) as CrashEntry;
    }
  } catch {
    // Ignore
  }
  return null;
}
