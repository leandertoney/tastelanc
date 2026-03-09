/**
 * Shared AI Chat component — adapts to each app's brand (Rosie, Mollie, etc.)
 * Uses the theme singleton for brand, colors, assets, and supabase client.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  Keyboard,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getColors, getBrand, getAssets, getSupabase, getAnonKey } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { requestReviewIfEligible } from '../lib/reviewPrompts';
import { ONBOARDING_DATA_KEY } from '../types/onboarding';
import type { OnboardingData } from '../types/onboarding';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface RosieChatProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToRestaurant?: (restaurantId: string) => void;
}

interface QuickActionConfig {
  icon: string;
  label: string;
  prompt: string;
}

// Parse message text and extract restaurant links in format [[Name|id]]
interface TextPart {
  type: 'text' | 'link';
  content: string;
  restaurantId?: string;
}

function parseMessageWithLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const linkRegex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'link', content: match[1], restaurantId: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  return parts;
}

async function getUserPreferences(): Promise<OnboardingData | null> {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    if (data) return JSON.parse(data) as OnboardingData;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
  }
  return null;
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );

    const anim1 = createDotAnimation(dot1, 0);
    const anim2 = createDotAnimation(dot2, 200);
    const anim3 = createDotAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => { anim1.stop(); anim2.stop(); anim3.stop(); };
  }, [dot1, dot2, dot3]);

  const getDotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  const colors = getColors();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted }, getDotStyle(dot1)]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted }, getDotStyle(dot2)]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted }, getDotStyle(dot3)]} />
    </View>
  );
}

export default function RosieChat({ visible, onClose, onNavigateToRestaurant }: RosieChatProps) {
  const colors = getColors();
  const brand = getBrand();
  const assets = getAssets();
  const styles = useStyles();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const flatListRef = useRef<any>(null);

  const aiPlayer = useVideoPlayer(assets.aiAnimated, player => {
    player.loop = true;
    player.muted = true;
  });

  useEffect(() => {
    if (visible) {
      aiPlayer.play();
    } else {
      aiPlayer.pause();
    }
  }, [visible, aiPlayer]);

  const QUICK_ACTIONS: QuickActionConfig[][] = useMemo(() => [
    [
      { icon: 'restaurant', label: 'Best dinner spots', prompt: brand.mollieSamplePrompt },
      { icon: 'beer', label: 'Happy hour deals', prompt: 'Where can I find happy hour deals?' },
    ],
    [
      { icon: 'sparkles', label: 'Personalized picks', prompt: 'Based on my preferences, what restaurants would you recommend?' },
      { icon: 'compass', label: 'Hidden gems', prompt: 'What are some hidden gem restaurants locals love?' },
    ],
  ], [brand.mollieSamplePrompt]);

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: brand.mollieGreeting, isUser: false, timestamp: new Date() },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const snapPoints = useMemo(() => ['90%'], []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  const renderBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  ), []);

  const callAI = useCallback(async (messageText: string) => {
    const supabase = getSupabase();
    const anonKey = getAnonKey();
    const preferences = await getUserPreferences();
    const { data, error } = await supabase.functions.invoke('rosie-chat', {
      body: { message: messageText, preferences, marketSlug: brand.marketSlug },
      headers: { Authorization: `Bearer ${anonKey}` },
    });
    if (error) throw error;
    return data?.answer || "I'm not sure how to respond to that. Could you try asking differently?";
  }, [brand.marketSlug]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    const userMessage: Message = { id: Date.now().toString(), text: messageText, isUser: true, timestamp: new Date() };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    Keyboard.dismiss();

    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);

    try {
      const answer = await callAI(messageText);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), text: answer, isUser: false, timestamp: new Date() }]);
      requestReviewIfEligible('rosie_interaction');
    } catch (error: any) {
      let errorDetail = String(error);
      if (error?.context) {
        try { errorDetail = JSON.stringify(await error.context.json()); } catch { try { errorDetail = await error.context.text(); } catch {} }
      }
      console.error('AI chat error detail:', errorDetail);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), text: "I'm having a little trouble connecting right now. Please try again in a moment!", isUser: false, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
    }
  }, [inputText, callAI]);

  const handleRestaurantPress = useCallback((restaurantId: string) => {
    if (onNavigateToRestaurant) {
      onClose();
      setTimeout(() => { onNavigateToRestaurant(restaurantId); }, 300);
    }
  }, [onClose, onNavigateToRestaurant]);

  const renderMessageText = (text: string, isUser: boolean) => {
    if (isUser) return <Text style={[styles.messageText, styles.userMessageText]}>{text}</Text>;

    const parts = parseMessageWithLinks(text);
    return (
      <Text style={[styles.messageText, styles.aiMessageText]}>
        {parts.map((part, index) => {
          if (part.type === 'link' && part.restaurantId) {
            return <Text key={index} style={styles.restaurantLink} onPress={() => handleRestaurantPress(part.restaurantId!)}>{part.content}</Text>;
          }
          return <Text key={index}>{part.content}</Text>;
        })}
      </Text>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
      {!item.isUser && (
        <View style={styles.avatarContainer}>
          <Image source={assets.aiAvatar} style={styles.aiAvatar} />
        </View>
      )}
      <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
        {renderMessageText(item.text, item.isUser)}
      </View>
    </View>
  );

  const handleQuickAction = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    setMessages((prev) => [...prev, { id: Date.now().toString(), text: text.trim(), isUser: true, timestamp: new Date() }]);
    setIsTyping(true);

    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);

    try {
      const answer = await callAI(text.trim());
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), text: answer, isUser: false, timestamp: new Date() }]);
      requestReviewIfEligible('rosie_interaction');
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), text: "I'm having a little trouble connecting right now. Please try again in a moment!", isUser: false, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
    }
  }, [isTyping, callAI]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.aiHeaderAvatar}>
              <VideoView player={aiPlayer} style={styles.aiHeaderVideo} contentFit="cover" nativeControls={false} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{brand.aiName}</Text>
              <Text style={styles.headerSubtitle}>{brand.mollieSubtitle}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <BottomSheetFlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item: Message) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingContainer}>
                <View style={styles.avatarContainer}>
                  <Image source={assets.aiAvatar} style={styles.aiAvatar} />
                </View>
                <View style={styles.typingBubble}>
                  <TypingDots />
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick suggestions</Text>
            {QUICK_ACTIONS.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.quickActionsRow}>
                {row.map((action, actionIndex) => (
                  <TouchableOpacity key={actionIndex} style={styles.quickAction} onPress={() => handleQuickAction(action.prompt)}>
                    <Ionicons name={action.icon as any} size={18} color={colors.accent} />
                    <Text style={styles.quickActionText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <BottomSheetTextInput
            style={styles.input}
            placeholder={`Ask ${brand.aiName} anything...`}
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color={inputText.trim() ? colors.textOnAccent : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
  },
  sheetBackground: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: colors.textSecondary,
    width: 40,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  aiHeaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBg,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  aiHeaderVideo: {
    width: 48,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  closeButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row' as const,
    marginBottom: 16,
    alignItems: 'flex-end' as const,
  },
  userMessageContainer: {
    justifyContent: 'flex-end' as const,
  },
  aiMessageContainer: {
    justifyContent: 'flex-start' as const,
  },
  avatarContainer: {
    marginRight: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: '75%' as any,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.cardBg,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.textOnAccent,
  },
  aiMessageText: {
    color: colors.text,
  },
  restaurantLink: {
    color: colors.accent,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
  typingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: colors.cardBgElevated,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickActionsTitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  quickActionsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 8,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickActionText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.cardBgElevated,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sendButtonDisabled: {
    backgroundColor: colors.cardBgElevated,
  },
}));
