import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Keyboard,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { supabase } from '../lib/supabase';
import { env } from '../lib/env';
import { requestReviewIfEligible } from '../lib/reviewPrompts';
import { ONBOARDING_DATA_KEY, OnboardingData } from '../types/onboarding';
import { BRAND } from '../config/brand';

// Mollie assets
const mollieImage = require('../../assets/images/mollie_avatar.png');
const mollieAnimated = require('../../assets/animations/mollie_animated.mp4');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface MollieChatProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToRestaurant?: (restaurantId: string) => void;
}

// Quick action definitions
interface QuickActionConfig {
  icon: string;
  label: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickActionConfig[][] = [
  [
    { icon: 'restaurant', label: 'Best dinner spots', prompt: BRAND.mollieSamplePrompt },
    { icon: 'beer', label: 'Happy hour deals', prompt: 'Where can I find happy hour deals?' },
  ],
  [
    { icon: 'sparkles', label: 'Personalized picks', prompt: 'Based on my preferences, what restaurants would you recommend?' },
    { icon: 'compass', label: 'Hidden gems', prompt: 'What are some hidden gem restaurants locals love?' },
  ],
];

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
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    // Add the link
    parts.push({
      type: 'link',
      content: match[1], // Restaurant name
      restaurantId: match[2], // Restaurant ID
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last link
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  // If no links found, return the whole text as a single part
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  return parts;
}

// Helper to fetch user preferences from AsyncStorage
async function getUserPreferences(): Promise<OnboardingData | null> {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    if (data) {
      return JSON.parse(data) as OnboardingData;
    }
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

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
    </View>
  );
}

export default function MollieChat({ visible, onClose, onNavigateToRestaurant }: MollieChatProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const flatListRef = useRef<any>(null);

  const molliePlayer = useVideoPlayer(mollieAnimated, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: BRAND.mollieGreeting,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const snapPoints = useMemo(() => ['90%'], []);

  useEffect(() => {
    if (visible) {
      // Open fully to show input immediately
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const sendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Fetch user preferences and call Mollie AI edge function
      const preferences = await getUserPreferences();
      const { data, error } = await supabase.functions.invoke('rosie-chat', {
        body: { message: messageText, preferences, marketSlug: BRAND.marketSlug },
        headers: { Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data?.answer || "I'm not sure how to respond to that. Could you try asking differently?",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Trigger review prompt on first successful Mollie interaction
      requestReviewIfEligible('mollie_interaction');
    } catch (error) {
      console.error('Mollie chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having a little trouble connecting right now. Please try again in a moment!",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      // Scroll to bottom after response
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [inputText]);

  const handleRestaurantPress = useCallback((restaurantId: string) => {
    if (onNavigateToRestaurant) {
      onClose(); // Close the chat first
      setTimeout(() => {
        onNavigateToRestaurant(restaurantId);
      }, 300); // Small delay to allow bottom sheet to close
    }
  }, [onClose, onNavigateToRestaurant]);

  const renderMessageText = (text: string, isUser: boolean) => {
    // User messages don't have links
    if (isUser) {
      return (
        <Text style={[styles.messageText, styles.userMessageText]}>
          {text}
        </Text>
      );
    }

    const parts = parseMessageWithLinks(text);

    return (
      <Text style={[styles.messageText, styles.aiMessageText]}>
        {parts.map((part, index) => {
          if (part.type === 'link' && part.restaurantId) {
            return (
              <Text
                key={index}
                style={styles.restaurantLink}
                onPress={() => handleRestaurantPress(part.restaurantId!)}
              >
                {part.content}
              </Text>
            );
          }
          return <Text key={index}>{part.content}</Text>;
        })}
      </Text>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      {!item.isUser && (
        <View style={styles.avatarContainer}>
          <Image source={mollieImage} style={styles.mollieAvatar} />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        {renderMessageText(item.text, item.isUser)}
      </View>
    </View>
  );

  const QuickAction = ({
    icon,
    label,
    onPress,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon as any} size={18} color={colors.accent} />
      <Text style={styles.quickActionText}>{label}</Text>
    </TouchableOpacity>
  );

  const handleQuickAction = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Fetch user preferences and call Mollie AI edge function
      const preferences = await getUserPreferences();
      const { data, error } = await supabase.functions.invoke('rosie-chat', {
        body: { message: text.trim(), preferences, marketSlug: BRAND.marketSlug },
        headers: { Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data?.answer || "I'm not sure how to respond to that. Could you try asking differently?",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Trigger review prompt on first successful Mollie interaction
      requestReviewIfEligible('mollie_interaction');
    } catch (error) {
      console.error('Mollie chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having a little trouble connecting right now. Please try again in a moment!",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isTyping]);


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
            <View style={styles.mollieHeaderAvatar}>
              <VideoView
                player={molliePlayer}
                style={styles.mollieHeaderImage}
                contentFit="cover"
                nativeControls={false}
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>{BRAND.aiName}</Text>
              <Text style={styles.headerSubtitle}>{BRAND.mollieSubtitle}</Text>
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
                  <Image source={mollieImage} style={styles.mollieAvatar} />
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
                  <QuickAction
                    key={actionIndex}
                    icon={action.icon}
                    label={action.label}
                    onPress={() => handleQuickAction(action.prompt)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <BottomSheetTextInput
            style={styles.input}
            placeholder="Ask Mollie anything..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? colors.textOnAccent : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mollieHeaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  mollieHeaderImage: {
    width: 48,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  mollieAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: '75%',
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
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: colors.cardBgElevated,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
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
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.cardBgElevated,
  },
});
