import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import type { EventType } from '../types/database';

const EVENT_TYPES: { type: EventType; label: string; icon: string; color: string }[] = [
  { type: 'live_music', label: 'Live Music', icon: 'musical-notes', color: '#FF6B6B' },
  { type: 'dj', label: 'DJ', icon: 'disc', color: '#C084FC' },
  { type: 'trivia', label: 'Trivia', icon: 'help-circle', color: '#60A5FA' },
  { type: 'karaoke', label: 'Karaoke', icon: 'mic', color: '#F472B6' },
  { type: 'comedy', label: 'Comedy', icon: 'happy', color: '#FBBF24' },
  { type: 'sports', label: 'Sports', icon: 'football', color: '#34D399' },
  { type: 'bingo', label: 'Bingo', icon: 'grid', color: '#FB923C' },
  { type: 'music_bingo', label: 'Music Bingo', icon: 'musical-notes', color: '#A78BFA' },
  { type: 'poker', label: 'Poker', icon: 'diamond', color: '#F87171' },
];

interface Props {
  visible: boolean;
  selectedTypes: EventType[];
  typeCounts: Partial<Record<EventType, number>>;
  onToggle: (type: EventType) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function EntertainmentFilterModal({
  visible,
  selectedTypes,
  typeCounts,
  onToggle,
  onClear,
  onClose,
}: Props) {
  const styles = useStyles();
  const colors = getColors();

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
          <Text style={styles.title}>Filter Events</Text>
          {selectedTypes.length > 0 ? (
            <TouchableOpacity onPress={onClear} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.clearButton} />
          )}
        </View>

        {/* Event Types */}
        <View style={styles.content}>
          <Text style={styles.subtitle}>Show me</Text>
          <View style={styles.typesGrid}>
            {EVENT_TYPES.map(({ type, label, icon, color }) => {
              const isSelected = selectedTypes.includes(type);
              const count = typeCounts[type] || 0;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => onToggle(type)}
                  style={[
                    styles.typeCard,
                    isSelected && { backgroundColor: color, borderColor: color },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.typeIconContainer, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : color + '20' }]}>
                    <Ionicons name={icon as any} size={22} color={isSelected ? '#FFFFFF' : color} />
                  </View>
                  <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                    {label}
                  </Text>
                  {count > 0 && (
                    <Text style={[styles.typeCount, isSelected && styles.typeCountSelected]}>
                      {count} {count === 1 ? 'event' : 'events'}
                    </Text>
                  )}
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Apply Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyText}>
              {selectedTypes.length > 0
                ? `Show ${selectedTypes.length} Type${selectedTypes.length !== 1 ? 's' : ''}`
                : 'Show All Events'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = createLazyStyles((colors) => ({
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
    fontWeight: '600' as const,
    color: colors.text,
    textAlign: 'center' as const,
    flex: 1,
  },
  clearButton: {
    width: 70,
    alignItems: 'flex-end' as const,
  },
  clearText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textMuted,
    marginBottom: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '47%' as any,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    position: 'relative' as const,
    minHeight: 100,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  },
  typeLabelSelected: {
    color: '#FFFFFF',
  },
  typeCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  typeCountSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  checkmark: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
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
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
}));
