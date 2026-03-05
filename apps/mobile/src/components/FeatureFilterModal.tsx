import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/colors';
import { formatFeatureName, getFeatureIconName } from '../lib/formatters';

interface FeatureGroup {
  key: string;
  label: string;
  icon: string;
  tint: string;
  features: string[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: 'entertainment',
    label: 'Entertainment',
    icon: 'musical-notes-outline',
    tint: '#FF6B6B',
    features: [
      'live_piano', 'live_band', 'live_dj', 'trivia_nights', 'karaoke',
      'comedy_shows', 'live_sports_viewing', 'arcade_games', 'board_games', 'pool_tables',
    ],
  },
  {
    key: 'dining_experience',
    label: 'Dining Experience',
    icon: 'wine-outline',
    tint: '#C084FC',
    features: [
      'private_dining', 'prix_fixe_menu', 'tasting_menu', 'chefs_table',
      'wine_pairing', 'beer_flights', 'cocktail_menu', 'seasonal_menu', 'farm_to_table',
    ],
  },
  {
    key: 'space_atmosphere',
    label: 'Space & Atmosphere',
    icon: 'sunny-outline',
    tint: '#FBBF24',
    features: [
      'outdoor_patio', 'heated_patio', 'rooftop_seating', 'fireplace',
      'waterfront', 'garden_dining', 'sidewalk_cafe', 'covered_outdoor',
    ],
  },
  {
    key: 'services',
    label: 'Services',
    icon: 'briefcase-outline',
    tint: '#60A5FA',
    features: [
      'reservations', 'walkins_welcome', 'takeout', 'delivery', 'catering',
      'event_space', 'full_bar', 'byob_allowed', 'valet_parking', 'free_parking', 'street_parking',
    ],
  },
  {
    key: 'accessibility_family',
    label: 'Accessibility & Family',
    icon: 'people-outline',
    tint: '#34D399',
    features: [
      'wheelchair_accessible', 'high_chairs', 'kids_menu', 'family_friendly',
      'pet_friendly_indoor', 'pet_friendly_patio',
    ],
  },
  {
    key: 'dietary',
    label: 'Dietary Accommodations',
    icon: 'leaf-outline',
    tint: '#4ADE80',
    features: [
      'vegan_options', 'vegetarian_options', 'gluten_free_options',
      'halal', 'kosher', 'allergy_friendly',
    ],
  },
];

interface Props {
  visible: boolean;
  selectedFeatures: string[];
  onToggle: (feature: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function FeatureFilterModal({
  visible,
  selectedFeatures,
  onToggle,
  onClear,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Filter by Features</Text>
          {selectedFeatures.length > 0 ? (
            <TouchableOpacity onPress={onClear} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.clearButton} />
          )}
        </View>

        {/* Feature Groups */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {FEATURE_GROUPS.map((group) => {
            const groupSelectedCount = group.features.filter(f => selectedFeatures.includes(f)).length;
            return (
              <View key={group.key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <View style={[styles.groupIconContainer, { backgroundColor: group.tint + '20' }]}>
                    <Ionicons name={group.icon as any} size={16} color={group.tint} />
                  </View>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  {groupSelectedCount > 0 && (
                    <View style={[styles.groupBadge, { backgroundColor: group.tint }]}>
                      <Text style={styles.groupBadgeText}>{groupSelectedCount}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.chipsContainer}>
                  {group.features.map((feature) => {
                    const isSelected = selectedFeatures.includes(feature);
                    return (
                      <TouchableOpacity
                        key={feature}
                        onPress={() => onToggle(feature)}
                        style={[
                          styles.chip,
                          isSelected && { backgroundColor: group.tint, borderColor: group.tint },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={getFeatureIconName(feature) as any}
                          size={14}
                          color={isSelected ? '#FFFFFF' : group.tint}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {formatFeatureName(feature)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyText}>
              {selectedFeatures.length > 0
                ? `Apply ${selectedFeatures.length} Filter${selectedFeatures.length !== 1 ? 's' : ''}`
                : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 4,
    width: 70,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  clearButton: {
    width: 70,
    alignItems: 'flex-end',
  },
  clearText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  group: {
    marginBottom: 28,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  groupIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  groupBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
