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

export type ContactCategory =
  | 'restaurant'
  | 'happy_hour'
  | 'entertainment'
  | 'event'
  | 'eventTip'
  | 'entertainmentTip';

// Whether the category is a tip/nomination flow (vs. owner/business flow)
function isTipCategory(category: ContactCategory) {
  return category === 'eventTip' || category === 'entertainmentTip';
}

// The type of thing being nominated, for the API
function nominationType(category: ContactCategory, isOwner: boolean) {
  if (isOwner) return 'owner';
  if (category === 'eventTip') return 'event';
  if (category === 'entertainmentTip') return 'entertainment';
  return 'restaurant';
}

const NOMINATIONS_API = __DEV__
  ? 'http://192.168.1.243:3000/api/mobile/nominations'
  : 'https://tastelanc.com/api/mobile/nominations';

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

  const isTip = isTipCategory(category);

  // For tip categories: show a picker first — are you the owner or a user nominating?
  const [isOwner, setIsOwner] = useState<boolean | null>(isTip ? null : true);

  const [formData, setFormData] = useState({
    spotName: '',   // restaurant / event / act name
    details: '',    // when & where, notes
    name: '',       // submitter name (optional for nominations)
    email: '',      // submitter email (optional for nominations)
    message: '',    // used for non-tip owner flows
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Reset on open
  useEffect(() => {
    if (visible) {
      setIsOwner(isTip ? null : true);
      setFormData({ spotName: '', details: '', name: '', email: '', message: '' });
      setIsSubmitted(false);
      setError('');
    }
  }, [visible, category]);

  // ─── Titles ───────────────────────────────────────────────
  const TITLES: Record<ContactCategory, string> = {
    restaurant: 'Feature Your Restaurant',
    happy_hour: 'List Your Happy Hour',
    entertainment: 'Promote Your Entertainment',
    event: 'Promote Your Event',
    eventTip: 'Know of an Event?',
    entertainmentTip: 'Hosting Something?',
  };

  const ownerTitle = category === 'entertainmentTip'
    ? 'Get Listed on ' + brand.appName
    : 'Submit Your Event';

  const nominationTitle = category === 'entertainmentTip'
    ? 'Nominate a Venue or Act'
    : 'Nominate an Event';

  // ─── Validation ───────────────────────────────────────────
  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // Owner flow for non-tip categories — name + email required
  const ownerFormValid =
    formData.name.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    validateEmail(formData.email);

  // Tip owner flow — spot name + name + email required
  const tipOwnerFormValid =
    formData.spotName.trim().length > 0 &&
    formData.name.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    validateEmail(formData.email);

  // Nomination flow — only the spot name is required
  const nominationFormValid = formData.spotName.trim().length > 0;

  const isFormValid =
    isOwner === null ? false
    : isTip && isOwner ? tipOwnerFormValid
    : isTip && !isOwner ? nominationFormValid
    : ownerFormValid;

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isFormValid) return;
    setIsSubmitting(true);
    setError('');

    try {
      if (isTip) {
        // Nominations + owner inquiries go through the nominations API
        const res = await fetch(NOMINATIONS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: nominationType(category, !!isOwner),
            spot_name: formData.spotName.trim(),
            details: formData.details.trim() || null,
            submitter_name: formData.name.trim() || null,
            submitter_email: formData.email.trim() || null,
            market_id: marketId || null,
          }),
        });
        if (!res.ok) throw new Error('Request failed');
      } else {
        // Original business owner flow — save directly to Supabase
        const supabase = getSupabase();
        const CATEGORY_MESSAGES: Record<ContactCategory, string> = {
          restaurant: `I'd like to get my restaurant featured on ${brand.appName}.`,
          happy_hour: `I'd like to list my happy hour specials on ${brand.appName}.`,
          entertainment: `I'd like to promote my entertainment/live music on ${brand.appName}.`,
          event: `I'd like to promote my event on ${brand.appName}.`,
          eventTip: '',
          entertainmentTip: '',
        };
        const { error: insertError } = await supabase
          .from('contact_submissions')
          .insert({
            name: formData.name.trim(),
            email: formData.email.trim(),
            business_name: formData.spotName.trim() || null,
            message: formData.message.trim() || CATEGORY_MESSAGES[category],
            interested_plan: null,
            market_id: marketId || null,
          });
        if (insertError) throw insertError;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success screen ───────────────────────────────────────
  if (isSubmitted) {
    const successMsg =
      isTip && !isOwner
        ? `Thanks for the tip! We'll look into it and get it listed as soon as we can.`
        : `We've received your message and will get back to you within 24–48 hours.`;

    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={64} color={colors.accent} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.successTitle}>Got it!</Text>
              <Text style={styles.successText}>{successMsg}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Role picker (tip categories only) ────────────────────
  const showPicker = isTip && isOwner === null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <Text style={styles.title}>
              {showPicker
                ? TITLES[category]
                : isTip && isOwner
                ? ownerTitle
                : isTip && !isOwner
                ? nominationTitle
                : TITLES[category]}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showPicker ? (
            // ── Picker ──────────────────────────────────────
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerPrompt}>
                {category === 'entertainmentTip'
                  ? 'Are you the venue/organizer, or nominating a favourite spot?'
                  : 'Are you the organizer, or did you hear about something happening?'}
              </Text>

              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => setIsOwner(true)}
                activeOpacity={0.8}
              >
                <View style={styles.pickerIconBg}>
                  <Ionicons name="business" size={24} color={colors.accent} />
                </View>
                <View style={styles.pickerTextBlock}>
                  <Text style={styles.pickerOptionTitle}>
                    {category === 'entertainmentTip' ? "I'm the venue / organizer" : "I'm the organizer"}
                  </Text>
                  <Text style={styles.pickerOptionSub}>Get your listing added to the app</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => setIsOwner(false)}
                activeOpacity={0.8}
              >
                <View style={styles.pickerIconBg}>
                  <Ionicons name="people" size={24} color={colors.accent} />
                </View>
                <View style={styles.pickerTextBlock}>
                  <Text style={styles.pickerOptionTitle}>
                    {category === 'entertainmentTip' ? 'I know a great spot / act' : 'I heard about something'}
                  </Text>
                  <Text style={styles.pickerOptionSub}>Nominate it and we'll reach out</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            // ── Form ────────────────────────────────────────
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Back link for tip categories */}
              {isTip && (
                <TouchableOpacity style={styles.backLink} onPress={() => setIsOwner(null)}>
                  <Ionicons name="chevron-back" size={14} color={colors.accent} />
                  <Text style={styles.backLinkText}>Back</Text>
                </TouchableOpacity>
              )}

              {/* Nomination flow */}
              {isTip && !isOwner && (
                <>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      {category === 'entertainmentTip' ? 'Venue or Act Name *' : 'Event Name *'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={formData.spotName}
                      onChangeText={(t) => setFormData((p) => ({ ...p, spotName: t }))}
                      placeholder={
                        category === 'entertainmentTip'
                          ? 'e.g. The Steel Petal, DJ Norah'
                          : 'e.g. Jazz Night at The Exchange'
                      }
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      {category === 'entertainmentTip' ? 'Where & When' : 'When & Where'}
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.details}
                      onChangeText={(t) => setFormData((p) => ({ ...p, details: t }))}
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
                      onChangeText={(t) => setFormData((p) => ({ ...p, name: t }))}
                      placeholder="Optional"
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
                      onChangeText={(t) => setFormData((p) => ({ ...p, email: t }))}
                      placeholder="Optional — only if you want a follow-up"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </>
              )}

              {/* Tip-owner flow */}
              {isTip && isOwner && (
                <>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      {category === 'entertainmentTip' ? 'Venue / Act Name *' : 'Event Name *'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={formData.spotName}
                      onChangeText={(t) => setFormData((p) => ({ ...p, spotName: t }))}
                      placeholder={
                        category === 'entertainmentTip'
                          ? 'e.g. The Steel Petal'
                          : 'e.g. Jazz Night at The Exchange'
                      }
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Details</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.details}
                      onChangeText={(t) => setFormData((p) => ({ ...p, details: t }))}
                      placeholder="Dates, venue, website, anything helpful"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Your Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(t) => setFormData((p) => ({ ...p, name: t }))}
                      placeholder="Your name"
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
                      onChangeText={(t) => setFormData((p) => ({ ...p, email: t }))}
                      placeholder="your@email.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </>
              )}

              {/* Standard owner flow (non-tip categories) */}
              {!isTip && (
                <>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Your Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(t) => setFormData((p) => ({ ...p, name: t }))}
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
                      onChangeText={(t) => setFormData((p) => ({ ...p, email: t }))}
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
                      value={formData.spotName}
                      onChangeText={(t) => setFormData((p) => ({ ...p, spotName: t }))}
                      placeholder="Your Restaurant / Venue Name"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Message</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.message}
                      onChangeText={(t) => setFormData((p) => ({ ...p, message: t }))}
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
                style={[styles.primaryButton, !isFormValid && styles.primaryButtonDisabled]}
                onPress={handleSubmit}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.textOnAccent} />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={colors.textOnAccent} />
                    <Text style={styles.primaryButtonText}>
                      {isTip && !isOwner ? 'Let Us Know' : 'Send Message'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                By submitting, you agree to our Privacy Policy and Terms of Service.
              </Text>
            </ScrollView>
          )}
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
  // ── Picker ────────────────────────────────────────────────
  pickerContainer: {
    padding: spacing.lg,
  },
  pickerPrompt: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  pickerOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  pickerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.accent}20`,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  pickerTextBlock: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  pickerOptionSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
  // ── Form ──────────────────────────────────────────────────
  form: {
    padding: spacing.lg,
  },
  backLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginBottom: spacing.md,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500' as const,
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
    minHeight: 90,
    paddingTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginTop: spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
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
  // ── Success ───────────────────────────────────────────────
  successContainer: {
    alignItems: 'center' as const,
    padding: spacing.xl,
    paddingTop: spacing.xl * 2,
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
}));
