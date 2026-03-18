import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import {
  getMyClaims,
  getClaimCode,
  cancelClaim,
  formatDiscount,
  type CouponClaim,
} from '../lib/coupons';
import { queryKeys } from '../lib/queryKeys';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function RedeemCodeModal({
  visible,
  claim,
  onClose,
}: {
  visible: boolean;
  claim: CouponClaim | null;
  onClose: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(60);
  const [loading, setLoading] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const colors = getColors();
  const styles = useRedeemStyles();
  const queryClient = useQueryClient();

  const handleRedeemed = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRedeemed(true);
    // Refresh the claims list so the card flips to "Redeemed" status
    queryClient.invalidateQueries({ queryKey: queryKeys.coupons.myClaims });
    // Auto-close after 3 seconds
    setTimeout(() => onClose(), 3000);
  }, [onClose, queryClient]);

  const fetchCode = useCallback(async () => {
    if (!claim) return;
    setLoading(true);
    try {
      const data = await getClaimCode(claim.id);
      setCode(data.code);
      setExpiresIn(data.expires_in);

      // Start countdown
      if (timerRef.current) clearInterval(timerRef.current);
      let remaining = data.expires_in;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          fetchCode();
        } else {
          setExpiresIn(remaining);
        }
      }, 1000);
    } catch (err: any) {
      // If server says already redeemed, show success and close
      if (err?.message?.includes('redeemed') || err?.message?.includes('already been')) {
        handleRedeemed();
      } else {
        console.warn('Failed to fetch code:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [claim, handleRedeemed]);

  useEffect(() => {
    if (visible && claim) {
      setIsRedeemed(false);
      setCode(null);
      fetchCode();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, claim, fetchCode]);

  if (!claim) return null;

  const coupon = claim.coupon;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isRedeemed ? (
            <View style={styles.content}>
              <View style={styles.redeemedIcon}>
                <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
              </View>
              <Text style={styles.redeemedTitle}>Coupon Redeemed!</Text>
              <Text style={styles.restaurantName}>{coupon.restaurant.name}</Text>
              <Text style={styles.couponTitle}>{coupon.title}</Text>
              <Text style={styles.discountText}>{formatDiscount(coupon)}</Text>
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={styles.restaurantName}>{coupon.restaurant.name}</Text>
              <Text style={styles.couponTitle}>{coupon.title}</Text>
              <Text style={styles.discountText}>{formatDiscount(coupon)}</Text>

              {coupon.description && (
                <Text style={styles.description}>{coupon.description}</Text>
              )}

              <View style={styles.codeContainer}>
                {loading && !code ? (
                  <ActivityIndicator size="large" color={colors.accent} />
                ) : code ? (
                  <>
                    <Text style={styles.codeLabel}>Show this code to your server</Text>
                    <Text style={styles.code}>{code}</Text>
                    <View style={styles.timerRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.timer}>New code in {expiresIn}s</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.codeLabel}>Unable to generate code</Text>
                )}
              </View>

              <Text style={styles.hint}>
                The code changes every 60 seconds for security
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default function MyCouponsScreen() {
  const styles = useStyles();
  const colors = getColors();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState<CouponClaim | null>(null);

  const { data: claims = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.coupons.myClaims,
    queryFn: getMyClaims,
    staleTime: 60 * 1000,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.myClaims });
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const handleUseCoupon = (claim: CouponClaim) => {
    if (claim.status !== 'claimed') return;
    setSelectedClaim(claim);
  };

  const handleCancelClaim = (claimId: string) => {
    Alert.alert(
      'Cancel Coupon',
      'Are you sure you want to release this coupon?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(claimId),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: CouponClaim }) => {
    const coupon = item.coupon;
    const isActive = item.status === 'claimed';
    const isRedeemed = item.status === 'redeemed';

    return (
      <TouchableOpacity
        style={[styles.card, !isActive && styles.cardInactive]}
        onPress={() => isActive ? handleUseCoupon(item) : navigation.navigate('RestaurantDetail', { id: coupon.restaurant.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardRestaurant}>{coupon.restaurant.name}</Text>
            <Text style={styles.cardTitle}>{coupon.title}</Text>
            <Text style={styles.cardDiscount}>{formatDiscount(coupon)}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            isActive && styles.statusActive,
            isRedeemed && styles.statusRedeemed,
            !isActive && !isRedeemed && styles.statusExpired,
          ]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {isActive && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.useButton}
              onPress={() => handleUseCoupon(item)}
            >
              <Ionicons name="ticket-outline" size={16} color={colors.textOnAccent} />
              <Text style={styles.useButtonText}>Use Coupon</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelClaim(item.id)}
            >
              <Text style={styles.cancelButtonText}>Release</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRedeemed && item.redeemed_at && (
          <Text style={styles.redeemedAt}>
            Redeemed {new Date(item.redeemed_at).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={claims}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Coupons Yet</Text>
            <Text style={styles.emptyText}>
              Browse restaurants to find and claim coupons
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('CouponsViewAll')}
            >
              <Text style={styles.browseButtonText}>Browse Coupons</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <RedeemCodeModal
        visible={!!selectedClaim}
        claim={selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />
    </SafeAreaView>
  );
}

const useRedeemStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  redeemedIcon: {
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  redeemedTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#22c55e',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    padding: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  content: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.lg,
  },
  restaurantName: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 4,
  },
  couponTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  discountText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.accent,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  codeContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 32,
    alignItems: 'center' as const,
    width: '100%' as const,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed' as const,
  },
  codeLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  code: {
    fontSize: 48,
    fontWeight: '800' as const,
    color: colors.accent,
    letterSpacing: 8,
  },
  timerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 12,
  },
  timer: {
    fontSize: 13,
    color: colors.textMuted,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
}));

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardRestaurant: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  cardDiscount: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.accent,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusActive: {
    backgroundColor: colors.accent,
  },
  statusRedeemed: {
    backgroundColor: '#22c55e',
  },
  statusExpired: {
    backgroundColor: colors.textMuted,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  cardActions: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  useButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  useButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textOnAccent,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  redeemedAt: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  browseButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textOnAccent,
  },
}));
