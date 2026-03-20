import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { useMarket } from '../context/MarketContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PartyRSVP'>;

type Step = 'enter-code' | 'enter-name' | 'confirming';

interface ValidatedCode {
  invite_code_id: string;
  spots_remaining: number;
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
    address: string;
  };
}

export default function PartyRSVPScreen({ navigation }: Props) {
  const colors = getColors();
  const brand = getBrand();
  const { market } = useMarket();

  const [step, setStep] = useState<Step>('enter-code');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [validatedCode, setValidatedCode] = useState<ValidatedCode | null>(null);
  const [loading, setLoading] = useState(false);

  const apiBase = market?.api_base_url ?? 'https://tastelanc.com';

  async function validateCode() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/party/validate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        Alert.alert('Invalid Code', data.error ?? 'This code is not valid. Please check with your restaurant.');
        return;
      }
      setValidatedCode(data);
      setStep('enter-name');
    } catch {
      Alert.alert('Error', 'Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitRSVP() {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert('Name Required', 'Please enter your first and last name.');
      return;
    }
    if (!validatedCode) return;
    setStep('confirming');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/party/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), name: trimmedName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert('RSVP Failed', data.error ?? 'Could not complete your RSVP. Please try again.');
        setStep('enter-name');
        return;
      }
      // Navigate to ticket
      navigation.replace('PartyTicket', { qr_token: data.qr_token, name: data.name });
    } catch {
      Alert.alert('Error', 'Could not connect. Please try again.');
      setStep('enter-name');
    } finally {
      setLoading(false);
    }
  }

  const styles = getStyles();

  const eventDate = validatedCode
    ? new Date(validatedCode.event.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.primary, colors.primary + 'CC', '#1A0800']}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.logoArea}>
            <View style={styles.iconCircle}>
              <Ionicons name="ticket-outline" size={36} color={colors.accent} />
            </View>
            <Text style={styles.title}>Got an Invite?</Text>
            <Text style={styles.subtitle}>
              {step === 'enter-code'
                ? 'Enter your invite code from your restaurant to RSVP.'
                : `${validatedCode?.event.name ?? 'TasteLanc Launch Party'}`}
            </Text>
          </View>

          {/* Step: Enter code */}
          {step === 'enter-code' && (
            <View style={styles.card}>
              <Text style={styles.label}>Invite Code</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={text => setCode(text.toUpperCase())}
                placeholder="HEMP-XXXXX-X-XXX"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={validateCode}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={validateCode}
                disabled={loading || !code.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.hint}>
                Get your code from the restaurant manager or owner. Each code supports a limited number of RSVPs.
              </Text>
            </View>
          )}

          {/* Step: Enter name */}
          {(step === 'enter-name' || step === 'confirming') && validatedCode && (
            <View style={styles.card}>
              {/* Event summary */}
              <View style={styles.eventBox}>
                <View style={styles.eventRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.accent} />
                  <Text style={styles.eventText}>{eventDate}</Text>
                </View>
                <View style={styles.eventRow}>
                  <Ionicons name="location-outline" size={14} color={colors.accent} />
                  <Text style={styles.eventText}>{validatedCode.event.venue}</Text>
                </View>
                <View style={styles.eventRow}>
                  <Ionicons name="people-outline" size={14} color={colors.accent} />
                  <Text style={styles.eventText}>
                    {validatedCode.spots_remaining} spot{validatedCode.spots_remaining !== 1 ? 's' : ''} remaining on this code
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="First and last name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submitRSVP}
                editable={step === 'enter-name'}
              />
              <TouchableOpacity
                style={[styles.button, (loading || step === 'confirming') && styles.buttonDisabled]}
                onPress={submitRSVP}
                disabled={loading || step === 'confirming' || !name.trim()}
              >
                {loading || step === 'confirming' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Confirm RSVP</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.hint}>
                Your name will appear on your ticket. This can't be changed after confirming.
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const getStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 40,
    },
    backButton: {
      marginBottom: 24,
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    logoArea: {
      alignItems: 'center',
      marginBottom: 32,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accent + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      gap: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    input: {
      backgroundColor: colors.surfaceLight ?? colors.surface + 'AA',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: colors.text,
      fontSize: 16,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      borderWidth: 1,
      borderColor: colors.border ?? '#333',
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    hint: {
      fontSize: 12,
      color: colors.textFaint ?? colors.textMuted,
      lineHeight: 18,
      textAlign: 'center',
    },
    eventBox: {
      backgroundColor: colors.accent + '15',
      borderRadius: 12,
      padding: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.accent + '30',
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    eventText: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
    },
  };
});
