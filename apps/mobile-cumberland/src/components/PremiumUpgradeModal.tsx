import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/colors';
import { BRAND } from '../config/brand';

interface PremiumUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  featureName?: string;
}

const PREMIUM_BENEFITS = [
  { icon: 'trophy', text: `Vote for ${BRAND.cityPossessive} Best` },
  { icon: 'pricetag', text: 'Exclusive deals & discounts' },
  { icon: 'flash', text: 'Early access to events' },
  { icon: 'remove-circle', text: 'Ad-free experience' },
] as const;

export default function PremiumUpgradeModal({
  visible,
  onClose,
  onUpgrade,
  featureName = 'this feature',
}: PremiumUpgradeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.starContainer}>
              <Ionicons name="star" size={32} color="#FFD700" />
            </View>
            <Text style={styles.title}>Upgrade to Premium</Text>
            <Text style={styles.subtitle}>
              Unlock {featureName} and more exclusive features
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            {PREMIUM_BENEFITS.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={styles.checkContainer}>
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                </View>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
            <Text style={styles.upgradeButtonText}>Upgrade Now - $4.99/mo</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  starContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  upgradeButton: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
