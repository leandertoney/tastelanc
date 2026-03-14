import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { spacing, typography, radius } from '../../constants/spacing';
import type { RootStackParamList } from '../../navigation/types';
import { useEmailThread } from '../../hooks/useEmailThread';
import { useSenderIdentity } from '../../hooks/useSalesInbox';
import { sendEmail } from '../../lib/salesApi';
import type { ThreadMessage } from '../../lib/salesApi';
import { queryKeys } from '../../lib/queryKeys';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EmailThreadRoute = RouteProp<RootStackParamList, 'EmailThread'>;

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' at ' +
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ message, styles, colors }: { message: ThreadMessage; styles: any; colors: any }) {
  const isSent = message.direction === 'sent';

  return (
    <View style={[styles.bubbleContainer, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
      <View style={[styles.bubble, isSent ? styles.bubbleBgSent : styles.bubbleBgReceived]}>
        {message.subject && (
          <Text style={[styles.bubbleSubject, isSent && styles.bubbleTextSent]}>{message.subject}</Text>
        )}
        <Text style={[styles.bubbleText, isSent && styles.bubbleTextSent]}>
          {message.body_text || '(No content)'}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text style={styles.bubbleTime}>{formatTimestamp(message.timestamp)}</Text>
          {isSent && message.delivery_status && (
            <Ionicons
              name={
                message.delivery_status === 'opened' ? 'checkmark-done' :
                message.delivery_status === 'delivered' ? 'checkmark-done-outline' :
                'checkmark-outline'
              }
              size={14}
              color={message.delivery_status === 'opened' ? colors.success : colors.textSecondary}
            />
          )}
        </View>
      </View>
    </View>
  );
}

export default function EmailThreadScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EmailThreadRoute>();
  const { counterpartyEmail, counterpartyName } = route.params;
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const styles = useStyles();
  const colors = getColors();

  const { data, isLoading, isError, refetch } = useEmailThread(counterpartyEmail);
  const { data: identityData } = useSenderIdentity();

  const [replyText, setReplyText] = useState('');
  const [replySubject, setReplySubject] = useState('');

  // Get the user identity for sending
  const userIdentity = identityData?.identity;

  // Scroll to bottom when messages load
  useEffect(() => {
    if (data?.messages?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [data?.messages?.length]);

  // Invalidate unread count when thread opens (server marks as read)
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.unreadCount });
    queryClient.invalidateQueries({ queryKey: ['sales', 'inbox'] });
  }, [queryClient]);

  // Determine reply context from last message
  const lastMessage = data?.messages?.[data.messages.length - 1];
  const lastResendId = lastMessage?.resend_id;
  const lastSubject = lastMessage?.subject;

  const sendMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      setReplyText('');
      setReplySubject('');
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.thread(counterpartyEmail) });
      queryClient.invalidateQueries({ queryKey: ['sales', 'inbox'] });
    },
    onError: (error: Error) => {
      Alert.alert('Send Failed', error.message);
    },
  });

  const handleSend = useCallback(() => {
    if (!replyText.trim()) return;

    const subject = replySubject.trim() ||
      (lastSubject ? (lastSubject.startsWith('Re: ') ? lastSubject : `Re: ${lastSubject}`) : 'Follow up');

    sendMutation.mutate({
      recipientEmail: counterpartyEmail,
      recipientName: counterpartyName,
      subject,
      headline: subject,
      emailBody: replyText.trim(),
      senderName: userIdentity?.name,
      senderEmail: userIdentity?.email,
      inReplyToMessageId: lastResendId || undefined,
    });
  }, [replyText, replySubject, counterpartyEmail, counterpartyName, userIdentity, lastResendId, lastSubject, sendMutation]);

  const renderItem = useCallback(({ item }: { item: ThreadMessage }) => (
    <MessageBubble message={item} styles={styles} colors={colors} />
  ), [styles, colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {counterpartyName || counterpartyEmail}
          </Text>
          {counterpartyName && (
            <Text style={styles.headerEmail} numberOfLines={1}>{counterpartyEmail}</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.errorTitle}>Couldn't load messages</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={data?.messages || []}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No messages yet</Text>
              </View>
            }
          />
        )}

        {/* Reply Composer */}
        <View style={styles.composer}>
          <View style={styles.composerInputRow}>
            <TextInput
              style={styles.composerInput}
              placeholder="Reply..."
              placeholderTextColor={colors.inputPlaceholder}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={5000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!replyText.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!replyText.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textOnAccent} />
              ) : (
                <Ionicons name="send" size={20} color={colors.textOnAccent} />
              )}
            </TouchableOpacity>
          </View>
          {userIdentity && (
            <Text style={styles.sendingAs}>
              Sending as {userIdentity.name} &lt;{userIdentity.email}&gt;
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: typography.headline,
    fontWeight: '600' as const,
    color: colors.text,
  },
  headerEmail: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  centered: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleContainer: {
    marginBottom: spacing.sm + 4,
    maxWidth: '85%' as any,
  },
  bubbleSent: { alignSelf: 'flex-end' as const },
  bubbleReceived: { alignSelf: 'flex-start' as const },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  bubbleBgSent: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleBgReceived: {
    backgroundColor: colors.cardBgElevated,
    borderBottomLeftRadius: 4,
  },
  bubbleSubject: {
    fontSize: typography.footnote,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: typography.subhead,
    color: colors.text,
    lineHeight: 22,
  },
  bubbleTextSent: {
    color: colors.textOnAccent,
  },
  bubbleMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    marginTop: 6,
    gap: 4,
  },
  bubbleTime: {
    fontSize: typography.caption2,
    color: 'rgba(255,255,255,0.6)',
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  composerInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: typography.subhead,
    color: colors.text,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendingAs: {
    fontSize: typography.caption2,
    color: colors.textSecondary,
    marginTop: 6,
    paddingLeft: 4,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: typography.subhead,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: typography.headline,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  retryText: {
    fontSize: typography.subhead,
    fontWeight: '600' as const,
    color: colors.textOnAccent,
  },
}));
