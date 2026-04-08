import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const TICKET_CARD_WIDTH = SCREEN_WIDTH * 0.82;
export const TICKET_CARD_WIDTH_FULL = SCREEN_WIDTH - spacing.md * 2;
const CARD_HEIGHT = 134;
const SCALLOP_SIZE = 10;

/**
 * Renders a row of semicircle scallops along an edge to create a perforated look.
 */
function ScallopEdge({ side, color, width }: { side: 'top' | 'bottom'; color: string; width: number }) {
  const count = Math.floor(width / (SCALLOP_SIZE * 1.6));
  return (
    <View
      style={{
        position: 'absolute',
        [side]: -SCALLOP_SIZE / 2,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        zIndex: 10,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: SCALLOP_SIZE,
            height: SCALLOP_SIZE,
            borderRadius: SCALLOP_SIZE / 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

/** Decorative barcode with a tiny code underneath */
function Barcode({ code }: { code: string }) {
  const colors = getColors();
  const barWidths = [2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 2];
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.2, height: 28 }}>
        {barWidths.map((w, i) => (
          <View
            key={i}
            style={{
              width: w,
              height: '100%',
              backgroundColor: colors.text,
              opacity: 0.12,
              borderRadius: 0.5,
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 7, color: colors.textMuted, opacity: 0.4, marginTop: 1, letterSpacing: 2, fontWeight: '500' }}>
        {code}
      </Text>
    </View>
  );
}

interface DealTicketCardProps {
  title: string;
  description?: string | null;
  restaurantName: string;
  discountLabel: string;
  imageUrl?: string;
  onPress: () => void;
  fullWidth?: boolean;
}

export default function DealTicketCard({
  title,
  description,
  restaurantName,
  discountLabel,
  imageUrl,
  onPress,
  fullWidth = false,
}: DealTicketCardProps) {
  const colors = getColors();
  const styles = useStyles();
  const cardWidth = fullWidth ? TICKET_CARD_WIDTH_FULL : TICKET_CARD_WIDTH;

  // Generate a decorative ticket code from the title
  const ticketCode = title.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase().padEnd(6, '0');

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Perforated scallop edges — top and bottom */}
      <ScallopEdge side="top" color={colors.primary} width={cardWidth} />
      <ScallopEdge side="bottom" color={colors.primary} width={cardWidth} />

      <View style={styles.inner}>
        {/* Left stub — image + discount */}
        <View style={[styles.stub, { width: cardWidth * 0.33 }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.stubImage} />
          ) : (
            <View style={[styles.stubFallback, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="pricetag" size={26} color={colors.accent} />
            </View>
          )}
          <View style={[styles.discountBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.discountText, { color: colors.textOnAccent }]}>
              {discountLabel}
            </Text>
          </View>
        </View>

        {/* Vertical dashed divider with cutouts */}
        <View style={styles.divider}>
          <View style={[styles.dividerCutout, styles.dividerCutoutTop, { backgroundColor: colors.primary }]} />
          <View style={styles.dashes}>
            {Array.from({ length: 11 }).map((_, i) => (
              <View key={i} style={[styles.dash, { backgroundColor: colors.textMuted + '30' }]} />
            ))}
          </View>
          <View style={[styles.dividerCutout, styles.dividerCutoutBottom, { backgroundColor: colors.primary }]} />
        </View>

        {/* Right side — content */}
        <View style={styles.content}>
          <View style={styles.textArea}>
            <Text style={[styles.restaurant, { color: colors.accent }]} numberOfLines={1}>
              {restaurantName}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {description ? (
              <Text style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>

          <View style={styles.bottomRow}>
            <Barcode code={ticketCode} />
            <View style={[styles.viewDeal, { borderColor: colors.accent + '60' }]}>
              <Text style={[styles.viewDealText, { color: colors.accent }]}>View Deal</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.accent} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CUTOUT = 14;

const useStyles = createLazyStyles((colors) => ({
  card: {
    height: CARD_HEIGHT,
    backgroundColor: colors.cardBg,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
  },
  stub: {
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  stubImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  stubFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  divider: {
    width: CUTOUT,
    alignItems: 'center',
    zIndex: 10,
  },
  dividerCutout: {
    width: CUTOUT,
    height: CUTOUT / 2,
  },
  dividerCutoutTop: {
    borderBottomLeftRadius: CUTOUT,
    borderBottomRightRadius: CUTOUT,
  },
  dividerCutoutBottom: {
    borderTopLeftRadius: CUTOUT,
    borderTopRightRadius: CUTOUT,
  },
  dashes: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  dash: {
    width: 1.5,
    height: 4,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    justifyContent: 'space-between',
  },
  textArea: {
    flex: 1,
  },
  restaurant: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
    marginTop: 2,
  },
  description: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textMuted,
    lineHeight: 14,
    marginTop: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  viewDeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  viewDealText: {
    fontSize: 11,
    fontWeight: '600',
  },
}));
