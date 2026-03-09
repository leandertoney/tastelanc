import { useState } from 'react';
import SharedPartnerCTACard from '@tastelanc/mobile-shared/src/components/PartnerCTACard';
import type { ContactCategory } from '@tastelanc/mobile-shared/src/components/PartnerCTACard';
import { Ionicons } from '@expo/vector-icons';
import PartnerContactModal from './PartnerContactModal';

interface PartnerCTACardProps {
  icon: keyof typeof Ionicons.glyphMap;
  headline: string;
  subtext: string;
  category: ContactCategory;
  width: number;
  height: number;
}

export default function PartnerCTACard(props: PartnerCTACardProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <SharedPartnerCTACard
        {...props}
        onContactPress={() => setModalVisible(true)}
      />
      <PartnerContactModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        category={props.category}
      />
    </>
  );
}
