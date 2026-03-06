import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, radius } from '../../constants/colors';
import type { RootStackParamList } from '../../navigation/types';
import { useSenderIdentity } from '../../hooks/useSalesInbox';
import { sendEmail, generateAiEmail } from '../../lib/salesApi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ComposeRoute = RouteProp<RootStackParamList, 'ComposeEmail'>;

export default function ComposeEmailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ComposeRoute>();
  const queryClient = useQueryClient();

  const { data: identityData } = useSenderIdentity();
  const userIdentity = identityData?.identity;

  const [to, setTo] = useState(route.params?.recipientEmail || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(route.params?.subject || '');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const sendMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'unreadCount'] });
      Keyboard.dismiss();
      Alert.alert('Sent', 'Email sent successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert('Send Failed', error.message);
    },
  });

  const handleSend = useCallback(() => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      Alert.alert('Missing Fields', 'Please fill in To, Subject, and Body');
      return;
    }

    sendMutation.mutate({
      recipientEmail: to.trim(),
      recipientName: route.params?.recipientName,
      subject: subject.trim(),
      headline: subject.trim(),
      emailBody: body.trim(),
      senderName: userIdentity?.name,
      senderEmail: userIdentity?.email,
      cc: cc.trim() || undefined,
      inReplyToMessageId: route.params?.inReplyToMessageId,
      threadId: route.params?.threadId,
    });
  }, [to, cc, subject, body, userIdentity, route.params, sendMutation]);

  const handleAiGenerate = useCallback(() => {
    const tones = [
      { label: 'Professional', value: 'professional' },
      { label: 'Friendly', value: 'friendly' },
      { label: 'Casual', value: 'casual' },
      { label: 'Excited', value: 'excited' },
    ];

    Alert.alert('AI Email Tone', 'Choose a tone for the generated email', [
      ...tones.map(t => ({
        text: t.label,
        onPress: () => runAiGenerate(t.value),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [to]);

  const runAiGenerate = useCallback(async (tone: string) => {
    setIsGenerating(true);
    try {
      const result = await generateAiEmail({
        action: 'generate',
        ...(to.trim() && { recipientEmail: to.trim() }),
        ...(route.params?.recipientName && { recipientName: route.params.recipientName }),
        objective: 'b2b_cold_outreach',
        tone,
      });

      // API returns { email: { subject, body, ... } }
      const email = (result as Record<string, unknown>).email as Record<string, string> | undefined;
      const data = email || result;
      if (data.subject) setSubject(data.subject as string);
      if (data.body) setBody(data.body as string);
    } catch (error) {
      Alert.alert('AI Error', error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [to, route.params?.recipientName]);

  const canSend = to.trim() && subject.trim() && body.trim() && !sendMutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Email</Text>
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.headerButton, !canSend && styles.headerButtonDisabled]}
          disabled={!canSend}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={[styles.sendText, !canSend && styles.sendTextDisabled]}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} keyboardDismissMode="interactive">
          {/* From (read-only) */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>From:</Text>
            <Text style={styles.fieldValueMuted}>
              {userIdentity
                ? `${userIdentity.name} <${userIdentity.email}>`
                : 'Loading...'}
            </Text>
          </View>

          {/* Reply-To (read-only) */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Reply-To:</Text>
            <Text style={styles.fieldValueMuted}>
              {userIdentity?.replyEmail || 'Loading...'}
            </Text>
          </View>

          {/* To */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>To:</Text>
            <TextInput
              style={styles.fieldInput}
              value={to}
              onChangeText={setTo}
              placeholder="recipient@example.com"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* CC (optional) */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>CC:</Text>
            <TextInput
              style={styles.fieldInput}
              value={cc}
              onChangeText={setCc}
              placeholder="Optional"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Subject */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Subject:</Text>
            <TextInput
              style={styles.fieldInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Email subject"
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>

          {/* AI Generate button */}
          <TouchableOpacity
            style={styles.aiButton}
            onPress={handleAiGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="sparkles" size={16} color={colors.accent} />
            )}
            <Text style={styles.aiButtonText}>
              {isGenerating ? 'Generating...' : 'AI Generate'}
            </Text>
          </TouchableOpacity>

          {/* Body */}
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="Write your email..."
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: { padding: 4 },
  headerButtonDisabled: { opacity: 0.4 },
  headerTitle: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
  },
  cancelText: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  sendText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.accent,
  },
  sendTextDisabled: {
    color: colors.textSecondary,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  fieldLabel: {
    fontSize: typography.subhead,
    color: colors.textSecondary,
    width: 65,
  },
  fieldInput: {
    flex: 1,
    fontSize: typography.subhead,
    color: colors.text,
    padding: 0,
  },
  fieldValueMuted: {
    flex: 1,
    fontSize: typography.subhead,
    color: colors.textMuted,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  aiButtonText: {
    fontSize: typography.footnote,
    fontWeight: '600',
    color: colors.accent,
  },
  bodyInput: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 200,
    lineHeight: 24,
  },
});
