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
  Platform,
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
  cancelClaim,
  redeemClaim,
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
  const [phase, setPhase] = useState<'confirm' | 'redeeming' | 'success'>('confirm');
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const colors = getColors();
  const styles = useRedeemStyles();
  const queryClient = useQueryClient();

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPhase('confirm');
      setConfirmationCode(null);
    }
  }, [visible]);

  // Auto-close after 4 seconds on success
  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(timer);
    }
  }, [phase, onClose]);

  const handleRedeem = useCallback(async () => {
    if (!claim) return;
    setPhase('redeeming');
    try {
      const result = await redeemClaim(claim.id);
      setConfirmationCode(result.confirmation_code);
      setPhase('success');
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.myClaims });
    } catch (err: any) {
      setPhase('confirm');
      Alert.alert('Could not redeem', err.message || 'Please try again.');
    }
  }, [claim, queryClient]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  if (!claim) return null;

  const coupon = claim.coupon;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {phase === 'confirm' && (
            <View style={styles.confirmContainer}>
              <Text style={styles.restaurantName}>{coupon.restaurant.name}</Text>
              <Text style={styles.couponTitle}>{coupon.title}</Text>
              <Text style={styles.discountText}>{formatDiscount(coupon)}</Text>

              <View style={styles.couponPreview}>
                {coupon.description ? (
                  <Text style={styles.description}>{coupon.description}</Text>
                ) : null}
              </View>

              <TouchableOpacity style={styles.redeemButton} onPress={handleRedeem} activeOpacity={0.85}>
                <Text style={styles.redeemButtonText}>Redeem Now</Text>
              </TouchableOpacity>
              <Text style={styles.redeemSubtext}>
                Show your server this screen, then tap Redeem Now together
              </Text>
            </View>
          )}

          {phase === 'redeeming' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}

          {phase === 'success' && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
              <Text style={styles.successTitle}>Redeemed!</Text>
              <Text style={styles.restaurantName}>{coupon.restaurant.name}</Text>
              <Text style={styles.couponTitle}>{coupon.title}</Text>
              {confirmationCode && (
                <View style={styles.confirmationSection}>
                  <Text style={styles.confirmationLabel}>Confirmation #</Text>
                  <Text style={styles.confirmationCode}>{confirmationCode}</Text>
                </View>
              )}
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
  restaurantName: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: 'center' as const,
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
    textAlign: 'center' as const,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  // Phase: confirm
  confirmContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.lg,
  },
  couponPreview: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    borderStyle: 'dashed' as const,
    width: '100%' as const,
    alignItems: 'center' as const,
    minHeight: 48,
    justifyContent: 'center' as const,
  },
  redeemButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: 'center' as const,
    marginTop: spacing.lg,
    width: '100%' as const,
  },
  redeemButtonText: {
    color: colors.textOnAccent,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  redeemSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: spacing.sm,
  },
  // Phase: redeeming
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  // Phase: success
  successContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.lg,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#22c55e',
    marginTop: spacing.md,
    textAlign: 'center' as const,
  },
  confirmationSection: {
    marginTop: spacing.lg,
    alignItems: 'center' as const,
  },
  confirmationLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  confirmationCode: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
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
