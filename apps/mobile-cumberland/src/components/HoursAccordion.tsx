import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RestaurantHours, DayOfWeek } from '../types/database';
import { colors, radius } from '../constants/colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HoursAccordionProps {
  hours: RestaurantHours[];
}

const DAYS_ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function formatTime(time: string | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getCurrentDay(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function isCurrentlyOpen(hours: RestaurantHours[], currentDay: DayOfWeek): boolean {
  const todayHours = hours.find((h) => h.day_of_week === currentDay);
  if (!todayHours || todayHours.is_closed || !todayHours.open_time || !todayHours.close_time) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
}

export default function HoursAccordion({ hours }: HoursAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentDay = getCurrentDay();
  const isOpen = isCurrentlyOpen(hours, currentDay);
  const todayHours = hours.find((h) => h.day_of_week === currentDay);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const getTodayHoursText = (): string => {
    if (!todayHours) return 'Hours not available';
    if (todayHours.is_closed) return 'Closed today';
    if (!todayHours.open_time || !todayHours.close_time) return 'Hours not available';
    return `${formatTime(todayHours.open_time)} - ${formatTime(todayHours.close_time)}`;
  };

  const sortedHours = DAYS_ORDER.map((day) => {
    const dayHours = hours.find((h) => h.day_of_week === day);
    return {
      day,
      hours: dayHours,
    };
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, isOpen ? styles.openDot : styles.closedDot]} />
          <Text style={[styles.statusText, isOpen ? styles.openText : styles.closedText]}>
            {isOpen ? 'Open Now' : 'Closed'}
          </Text>
          <Text style={styles.todayHours}>{getTodayHoursText()}</Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.hoursContainer}>
          {sortedHours.map(({ day, hours: dayHours }) => (
            <View
              key={day}
              style={[styles.hourRow, day === currentDay && styles.currentDayRow]}
            >
              <Text style={[styles.dayLabel, day === currentDay && styles.currentDayText]}>
                {DAY_LABELS[day]}
              </Text>
              <Text style={[styles.hoursText, day === currentDay && styles.currentDayText]}>
                {dayHours?.is_closed
                  ? 'Closed'
                  : dayHours?.open_time && dayHours?.close_time
                  ? `${formatTime(dayHours.open_time)} - ${formatTime(dayHours.close_time)}`
                  : 'N/A'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  openDot: {
    backgroundColor: colors.success,
  },
  closedDot: {
    backgroundColor: colors.error,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  openText: {
    color: colors.success,
  },
  closedText: {
    color: colors.error,
  },
  todayHours: {
    fontSize: 14,
    color: colors.textMuted,
  },
  hoursContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  currentDayRow: {
    backgroundColor: colors.cardBgElevated,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  dayLabel: {
    fontSize: 14,
    color: colors.text,
  },
  hoursText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  currentDayText: {
    fontWeight: '600',
    color: colors.text,
  },
});
