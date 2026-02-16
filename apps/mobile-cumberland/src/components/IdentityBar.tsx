import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';
import { formatCategoryName, formatCuisineName } from '../lib/formatters';
import type { RestaurantCategory, CuisineType } from '../types/database';
import TagChip from './TagChip';

interface IdentityBarProps {
  categories: RestaurantCategory[];
  cuisine: CuisineType | null;
  isVerified: boolean;
  priceRange: string | null;
}

function PriceRangeIndicator({ priceRange }: { priceRange: string }) {
  const filled = priceRange.length;
  const total = 4;

  return (
    <View style={priceStyles.container}>
      {Array.from({ length: total }, (_, i) => (
        <Text
          key={i}
          style={[
            priceStyles.dollar,
            i < filled ? priceStyles.dollarFilled : priceStyles.dollarEmpty,
          ]}
        >
          $
        </Text>
      ))}
    </View>
  );
}

const priceStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  dollar: {
    fontSize: 13,
    fontWeight: '700',
  },
  dollarFilled: {
    color: colors.text,
  },
  dollarEmpty: {
    color: colors.textSecondary,
    opacity: 0.4,
  },
});

export default function IdentityBar({
  categories,
  cuisine,
  isVerified,
  priceRange,
}: IdentityBarProps) {
  const displayCategories = categories?.slice(0, 3) || [];

  return (
    <View style={styles.container}>
      {cuisine && (
        <TagChip label={formatCuisineName(cuisine)} variant="default" />
      )}
      {priceRange && <PriceRangeIndicator priceRange={priceRange} />}
      {displayCategories.map((category) => (
        <TagChip
          key={category}
          label={formatCategoryName(category)}
          variant="default"
        />
      ))}
      {isVerified && <TagChip label="Verified" variant="success" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.primaryLight,
  },
});
