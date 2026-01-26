import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../constants/colors';

type ContactCategory = 'restaurant' | 'happy_hour' | 'entertainment' | 'event';

interface PartnerContactModalProps {
  visible: boolean;
  onClose: () => void;
  category: ContactCategory;
}

const CATEGORY_MESSAGES: Record<ContactCategory, string> = {
  restaurant: "I'd like to get my restaurant featured on TasteLanc.",
  happy_hour: "I'd like to list my happy hour specials on TasteLanc.",
  entertainment: "I'd like to promote my entertainment/live music on TasteLanc.",
  event: "I'd like to promote my event on TasteLanc.",
};

const CATEGORY_TITLES: Record<ContactCategory, string> = {
  restaurant: 'Feature Your Restaurant',
  happy_hour: 'List Your Happy Hour',
  entertainment: 'Promote Your Entertainment',
  event: 'Promote Your Event',
};

export default function PartnerContactModal({
  visible,
  onClose,
  category,
}: PartnerContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = formData.name.trim() && formData.email.trim() && validateEmail(formData.email);

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('contact_submissions')
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim(),
          business_name: formData.businessName.trim() || null,
          message: formData.message.trim(),
          interested_plan: null,
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
              <Text style={styles.successTitle}>Thank You!</Text>
              <Text style={styles.successText}>
                We've received your message and will get back to you within 24-48 hours.
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

            {/* Name Field */}
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

            {/* Email Field */}
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

            {/* Business Name Field */}
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

            {/* Message Field */}
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

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={colors.text} />
                  <Text style={styles.submitButtonText}>Send Message</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
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
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    position: 'absolute',
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
    fontWeight: '600',
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
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
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
