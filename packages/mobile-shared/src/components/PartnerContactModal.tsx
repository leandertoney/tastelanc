import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, getSupabase, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';

export type ContactCategory = 'restaurant' | 'happy_hour' | 'entertainment' | 'event' | 'eventTip' | 'entertainmentTip';

interface PartnerContactModalProps {
  visible: boolean;
  onClose: () => void;
  category: ContactCategory;
}

export default function PartnerContactModal({
  visible,
  onClose,
  category,
}: PartnerContactModalProps) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const { marketId } = useMarket();

  const CATEGORY_MESSAGES: Record<ContactCategory, string> = {
    restaurant: `I'd like to get my restaurant featured on ${brand.appName}.`,
    happy_hour: `I'd like to list my happy hour specials on ${brand.appName}.`,
    entertainment: `I'd like to promote my entertainment/live music on ${brand.appName}.`,
    event: `I'd like to promote my event on ${brand.appName}.`,
    eventTip: '',
    entertainmentTip: '',
  };

  const CATEGORY_TITLES: Record<ContactCategory, string> = {
    restaurant: 'Feature Your Restaurant',
    happy_hour: 'List Your Happy Hour',
    entertainment: 'Promote Your Entertainment',
    event: 'Promote Your Event',
    eventTip: 'Know of an Event?',
    entertainmentTip: 'Hosting Something?',
  };

  const isTip = category === 'eventTip' || category === 'entertainmentTip';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setFormData({
        name: '',
        email: '',
        businessName: '',
        message: CATEGORY_MESSAGES[category],
      });
      setIsSubmitted(false);
      setError('');
    }
  }, [visible, category]);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const isFormValid = formData.name.trim() && formData.email.trim() && validateEmail(formData.email);
  const isTipFormValid = isTip ? formData.businessName.trim().length > 0 : Boolean(isFormValid);

  const handleSubmit = async () => {
    if (!isTipFormValid) return;

    setIsSubmitting(true);
    setError('');

    try {
      const supabase = getSupabase();
      const tipPrefix = isTip
        ? `[Community Tip — ${category === 'eventTip' ? 'Event' : 'Entertainment'}]\n`
        : '';
      const { error: insertError } = await supabase
        .from('contact_submissions')
        .insert({
          name: formData.name.trim() || 'Anonymous',
          email: formData.email.trim() || null,
          business_name: formData.businessName.trim() || null,
          message: `${tipPrefix}${formData.message.trim()}`,
          interested_plan: null,
          market_id: marketId || null,
        });

      if (insertError) {
        throw insertError;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (isSubmitted) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={colors.accent} />
              </View>
              <Text style={styles.successTitle}>Got it!</Text>
              <Text style={styles.successText}>
                {isTip
                  ? `Thanks for the tip! We'll look into it and get it listed as soon as we can.`
                  : `We've received your message and will get back to you within 24-48 hours.`}
              </Text>
              <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <Text style={styles.title}>{CATEGORY_TITLES[category]}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isTip ? (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Event / Show Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.businessName}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, businessName: text }))}
                    placeholder="e.g. Jazz Night at The Exchange"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>When & Where</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.message}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, message: text }))}
                    placeholder="Date, time, venue — whatever you know"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Your Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                    placeholder="Optional — we won't spam you"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Your Email</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
                    placeholder="Optional — only if you want a follow-up"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Your Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                    placeholder="John Smith"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
                    placeholder="john@restaurant.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Business Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.businessName}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, businessName: text }))}
                    placeholder="Your Restaurant Name"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Message</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.message}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, message: text }))}
                    placeholder="Tell us more..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, !isTipFormValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isTipFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={colors.textOnAccent} />
                  <Text style={styles.submitButtonText}>{isTip ? 'Let Us Know' : 'Send Message'}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              By submitting, you agree to our Privacy Policy and Terms of Service.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = createLazyStyles((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  backdrop: {
    ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as any),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%' as any,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative' as const,
  },
  headerHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  closeButton: {
    position: 'absolute' as const,
    right: spacing.md,
    top: spacing.md,
    padding: spacing.xs,
  },
  form: {
    padding: spacing.lg,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  successContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 2,
  },
  doneButtonText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600' as const,
  },
}));
