import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const RW_TERRACOTTA = '#C84B31';
const RW_TERRACOTTA_DARK = '#8B2F1A';
const RW_YELLOW = '#F0D060';
const RW_YELLOW_DIM = 'rgba(240,208,96,0.65)';
const BG_DARK = '#1C0800';
const CARD_BG = 'rgba(255,255,255,0.06)';
const CARD_BORDER = 'rgba(240,208,96,0.15)';

export default function PartyRSVPScreen({ navigation }: Props) {
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
      await AsyncStorage.setItem('party_rsvp_token', data.qr_token);
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
      style={{ flex: 1, backgroundColor: BG_DARK }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[RW_TERRACOTTA_DARK, BG_DARK, BG_DARK]}
        locations={[0, 0.35, 1]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={RW_YELLOW} />
          </TouchableOpacity>

          <View style={styles.logoArea}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 36 }}>🎉</Text>
            </View>
            <Text style={styles.eyebrow}>POST-RESTAURANT WEEK</Text>
            <Text style={styles.title}>Industry Party</Text>
            <Text style={styles.subtitle}>
              {step === 'enter-code'
                ? 'Enter the invite code from your restaurant manager to RSVP.'
                : validatedCode?.event.name ?? 'TasteLanc Launch Party'}
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
                placeholder="e.g. TLRW7K4X"
                placeholderTextColor={RW_YELLOW_DIM}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={validateCode}
              />
              <TouchableOpacity
                style={[styles.button, (loading || !code.trim()) && styles.buttonDisabled]}
                onPress={validateCode}
                disabled={loading || !code.trim()}
              >
                {loading ? (
                  <ActivityIndicator color={BG_DARK} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.hint}>
                Get your code from your restaurant manager. Each code supports a limited number of RSVPs.
              </Text>
            </View>
          )}

          {/* Step: Enter name */}
          {(step === 'enter-name' || step === 'confirming') && validatedCode && (
            <View style={styles.card}>
              {/* Event summary */}
              <View style={styles.eventBox}>
                <View style={styles.eventRow}>
                  <Ionicons name="calendar-outline" size={14} color={RW_YELLOW} />
                  <Text style={styles.eventText}>{eventDate}</Text>
                </View>
                <View style={styles.eventRow}>
                  <Ionicons name="people-outline" size={14} color={RW_YELLOW} />
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
                placeholderTextColor={RW_YELLOW_DIM}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submitRSVP}
                editable={step === 'enter-name'}
              />
              <TouchableOpacity
                style={[styles.button, (loading || step === 'confirming' || !name.trim()) && styles.buttonDisabled]}
                onPress={submitRSVP}
                disabled={loading || step === 'confirming' || !name.trim()}
              >
                {loading || step === 'confirming' ? (
                  <ActivityIndicator color={BG_DARK} size="small" />
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

const getStyles = createLazyStyles(() => ({
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
    backgroundColor: 'rgba(200,75,49,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: RW_YELLOW_DIM,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: RW_YELLOW,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: RW_YELLOW_DIM,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: RW_YELLOW_DIM,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: RW_YELLOW,
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderColor: 'rgba(240,208,96,0.2)',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: RW_TERRACOTTA,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: RW_YELLOW,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(240,208,96,0.4)',
    lineHeight: 18,
    textAlign: 'center',
  },
  eventBox: {
    backgroundColor: 'rgba(200,75,49,0.15)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.3)',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventText: {
    fontSize: 13,
    color: RW_YELLOW,
    flex: 1,
  },
}));
