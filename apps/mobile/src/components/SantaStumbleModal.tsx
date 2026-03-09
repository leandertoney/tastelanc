import SharedSantaStumbleModal from '@tastelanc/mobile-shared/src/components/SantaStumbleModal';
import { santaStumble } from '../constants/santaStumble';
import { features } from '../constants/features';

const backgroundImage = require('../../assets/images/events/santa_stumble.png');

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigateToRestaurant: (id: string) => void;
  flyerMode?: boolean;
};

export default function SantaStumbleModal({
  visible,
  onClose,
  onNavigateToRestaurant,
  flyerMode = features.eventFlyerEnabled,
}: Props) {
  return (
    <SharedSantaStumbleModal
      visible={visible}
      onClose={onClose}
      onNavigateToRestaurant={onNavigateToRestaurant}
      flyerMode={flyerMode}
      data={santaStumble}
      backgroundImage={backgroundImage}
    />
  );
}
