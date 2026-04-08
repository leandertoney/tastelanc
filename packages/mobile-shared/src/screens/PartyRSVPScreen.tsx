import { useState, useEffect } from 'react';
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

interface PartyEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  address: string;
  spots_remaining: number | null;
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
  const apiBase = market?.api_base_url ?? 'https://tastelanc.com';

  const [event, setEvent] = useState<PartyEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/api/party/active`)
      .then(r => r.json())
      .then(data => setEvent(data.event))
      .catch(() => {})
      .finally(() => setLoadingEvent(false));
  }, [apiBase]);

  async function handleRSVP(response: 'yes' | 'no') {
    if (response === 'yes') {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      if (!trimmedName || trimmedName.length < 2) {
        Alert.alert('Name Required', 'Please enter your first and last name.');
        return;
      }
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        Alert.alert('Email Required', 'Please enter your email so we can link your ticket.');
        return;
      }
    } else {
      if (!name.trim() || name.trim().length < 2) {
        Alert.alert('Name Required', 'Please enter your name.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/party/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          response,
          source: 'app',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert('RSVP Failed', data.error ?? 'Could not complete your RSVP. Please try again.');
        return;
      }

      if (response === 'yes' && data.qr_token) {
        await AsyncStorage.setItem('party_rsvp_token', data.qr_token);
        navigation.replace('PartyTicket', { qr_token: data.qr_token, name: data.name });
      } else {
        setDeclined(true);
      }
    } catch {
      Alert.alert('Error', 'Could not connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const styles = getStyles();

  if (loadingEvent) {
    return (
      <View style={{ flex: 1, backgroundColor: BG_DARK, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={RW_TERRACOTTA} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: BG_DARK, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ color: RW_YELLOW_DIM, fontSize: 16, textAlign: 'center' }}>
          No active event at this time.
        </Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: RW_YELLOW, fontSize: 15, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const eventDate = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (declined) {
    return (
      <View style={{ flex: 1, backgroundColor: BG_DARK, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>👋</Text>
        <Text style={{ color: RW_YELLOW, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
          Thanks for letting us know
        </Text>
        <Text style={{ color: RW_YELLOW_DIM, fontSize: 14, textAlign: 'center' }}>
          We&apos;ll miss you, {name.trim().split(' ')[0]}!
        </Text>
        <TouchableOpacity style={{ marginTop: 24 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: RW_YELLOW, fontSize: 15, fontWeight: '600' }}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            <Text style={styles.title}>{event.name}</Text>
          </View>

          {/* Event details */}
          <View style={styles.card}>
            <View style={styles.eventBox}>
              <View style={styles.eventRow}>
                <Ionicons name="calendar-outline" size={14} color={RW_YELLOW} />
                <Text style={styles.eventText}>{eventDate}</Text>
              </View>
              <View style={styles.eventRow}>
                <Ionicons name="time-outline" size={14} color={RW_YELLOW} />
                <Text style={styles.eventText}>6:00 – 9:30 PM</Text>
              </View>
              <View style={styles.eventRow}>
                <Ionicons name="location-outline" size={14} color={RW_YELLOW} />
                <Text style={styles.eventText}>{event.venue}</Text>
              </View>
              <View style={styles.eventRow}>
                <Ionicons name="map-outline" size={14} color={RW_YELLOW} />
                <Text style={styles.eventText}>{event.address}</Text>
              </View>
            </View>

            {/* Name */}
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="First and last name"
              placeholderTextColor={RW_YELLOW_DIM}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              editable={!submitting}
            />

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={RW_YELLOW_DIM}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="done"
              editable={!submitting}
            />
            <Text style={styles.hint}>Your ticket will be linked to this email.</Text>

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.button, (submitting || !name.trim() || !email.includes('@')) && styles.buttonDisabled]}
              onPress={() => handleRSVP('yes')}
              disabled={submitting || !name.trim() || !email.includes('@')}
            >
              {submitting ? (
                <ActivityIndicator color={BG_DARK} size="small" />
              ) : (
                <Text style={styles.buttonText}>I&apos;ll Be There</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonSecondary, (submitting || !name.trim()) && styles.buttonDisabled]}
              onPress={() => handleRSVP('no')}
              disabled={submitting || !name.trim()}
            >
              <Text style={styles.buttonSecondaryText}>Can&apos;t Make It</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 28,
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
    fontSize: 26,
    fontWeight: '900',
    color: RW_YELLOW,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  eventBox: {
    backgroundColor: 'rgba(200,75,49,0.15)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.3)',
    marginBottom: 4,
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(240,208,96,0.2)',
  },
  hint: {
    fontSize: 11,
    color: 'rgba(240,208,96,0.35)',
    lineHeight: 16,
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
  buttonSecondary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240,208,96,0.2)',
  },
  buttonSecondaryText: {
    color: RW_YELLOW_DIM,
    fontSize: 15,
    fontWeight: '600',
  },
}));
