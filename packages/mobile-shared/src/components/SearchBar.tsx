import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  filterCount?: number;
  onFilterPress?: () => void;
}

export default function SearchBar({
  value,
  onChangeText,
  onClear,
  onFocus,
  onBlur,
  placeholder = 'Search restaurants...',
  autoFocus = false,
  filterCount = 0,
  onFilterPress,
}: SearchBarProps) {
  const styles = useStyles();
  const colors = getColors();
  const [isFocused, setIsFocused] = useState(false);
  const borderAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnimation, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, borderAnimation]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  const borderColor = borderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accent],
  });

  return (
    <Animated.View style={[styles.container, { borderColor }]}>
      <Ionicons
        name="search"
        size={20}
        color={isFocused ? colors.accent : colors.textSecondary}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      {onFilterPress && (
        <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
          <View style={[styles.filterIconContainer, filterCount > 0 && styles.filterIconActive]}>
            <Ionicons
              name="options-outline"
              size={18}
              color={filterCount > 0 ? '#FFFFFF' : colors.textSecondary}
            />
          </View>
          {filterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  filterButton: {
    marginLeft: 6,
    position: 'relative' as const,
  },
  filterIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterIconActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterBadge: {
    position: 'absolute' as const,
    top: -3,
    right: -3,
    backgroundColor: colors.accent,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.inputBg,
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
}));
