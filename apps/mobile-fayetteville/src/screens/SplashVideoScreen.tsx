import SharedSplashVideoScreen from '@tastelanc/mobile-shared/src/screens/SplashVideoScreen';
import { queryClient } from '../lib/queryClient';

interface SplashVideoScreenProps {
  onComplete: () => void;
}

export default function SplashVideoScreen({ onComplete }: SplashVideoScreenProps) {
  return <SharedSplashVideoScreen onComplete={onComplete} queryClient={queryClient} />;
}
