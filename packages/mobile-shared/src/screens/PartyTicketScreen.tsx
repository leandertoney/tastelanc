import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { createLazyStyles } from '../utils/lazyStyles';
import { useMarket } from '../context/MarketContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PartyTicket'>;

interface TicketData {
  id: string;
  name: string;
  qr_token: string;
  checked_in: boolean;
  checked_in_at: string | null;
  restaurant_name: string | null;
  event: {
    name: string;
    date: string;
    venue: string;
    address: string;
  } | null;
}

const RW_TERRACOTTA = '#C84B31';
const RW_TERRACOTTA_DARK = '#8B2F1A';
const RW_YELLOW = '#F0D060';
const RW_YELLOW_DIM = 'rgba(240,208,96,0.65)';
const BG_DARK = '#1C0800';

export default function PartyTicketScreen({ navigation, route }: Props) {
  const { qr_token, name: rsvpName } = route.params;
  const { market } = useMarket();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);

  const apiBase = market?.api_base_url ?? 'https://tastelanc.com';

  // Persist token to AsyncStorage so it appears in Profile → "My Party Ticket"
  // (covers deep link entry where PartyRSVPScreen didn't save it)
  useEffect(() => {
    if (qr_token) {
      AsyncStorage.setItem('party_rsvp_token', qr_token).catch(() => {});
    }
  }, [qr_token]);

  useEffect(() => {
    fetch(`${apiBase}/api/party/ticket/${qr_token}`)
      .then(r => r.json())
      .then(data => { if (data.ticket) setTicket(data.ticket); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [qr_token, apiBase]);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(qr_token)}`;

  const eventDate = ticket?.event
    ? new Date(ticket.event.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'Monday, April 20, 2026';

  const displayName = ticket?.name ?? rsvpName ?? '';
  const eventName = ticket?.event?.name ?? 'TasteLanc Launch Party';
  const address = ticket?.event?.address ?? '100 West Walnut Street, Lancaster, PA';

  const styles = getStyles();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: BG_DARK }]}>
        <ActivityIndicator color={RW_TERRACOTTA} size="large" />
        <Text style={styles.loadingText}>Loading your ticket...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG_DARK }}>
      <LinearGradient
        colors={[RW_TERRACOTTA_DARK, BG_DARK, BG_DARK]}
        locations={[0, 0.3, 1]}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={RW_YELLOW} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your Ticket</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Ticket card */}
          <View style={styles.ticketCard}>

            {/* Ticket top — terracotta gradient header */}
            <LinearGradient
              colors={[RW_TERRACOTTA, RW_TERRACOTTA_DARK]}
              style={styles.ticketTop}
            >
              <Text style={styles.ticketEyebrow}>POST-RESTAURANT WEEK</Text>
              <Text style={styles.ticketEventName}>{eventName}</Text>
              <Text style={styles.ticketSubtitle}>Industry Only · App-Exclusive Entry</Text>
            </LinearGradient>

            {/* Tear line */}
            <View style={styles.tearLine}>
              <View style={styles.tearCircleLeft} />
              <View style={styles.tearDash} />
              <View style={styles.tearCircleRight} />
            </View>

            {/* Ticket body */}
            <View style={styles.ticketBody}>
              <View style={styles.ticketField}>
                <Text style={styles.ticketFieldLabel}>NAME</Text>
                <Text style={styles.ticketFieldValue}>{displayName}</Text>
              </View>

              <View style={styles.ticketRow}>
                <View style={[styles.ticketField, { flex: 1 }]}>
                  <Text style={styles.ticketFieldLabel}>DATE</Text>
                  <Text style={styles.ticketFieldValueSmall}>Monday, April 20</Text>
                </View>
                <View style={[styles.ticketField, { flex: 1 }]}>
                  <Text style={styles.ticketFieldLabel}>TIME</Text>
                  <Text style={styles.ticketFieldValueSmall}>6:00 – 9:30 PM</Text>
                </View>
              </View>

              {ticket?.restaurant_name && (
                <View style={styles.ticketField}>
                  <Text style={styles.ticketFieldLabel}>RESTAURANT</Text>
                  <Text style={styles.ticketFieldValueSmall}>{ticket.restaurant_name}</Text>
                </View>
              )}

              {/* QR Code */}
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: qrImageUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.qrInstructions}>Show this QR code at the door</Text>

              {ticket?.checked_in && (
                <View style={styles.checkedInBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
                  <Text style={styles.checkedInText}>Checked in</Text>
                </View>
              )}
            </View>

            {/* Ticket footer */}
            <View style={styles.ticketFooter}>
              <Text style={styles.ticketFooterText}>{address}</Text>
              <Text style={styles.ticketFooterText}>TasteLanc · Lancaster, PA</Text>
            </View>
          </View>

          {/* Note */}
          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={16} color={RW_TERRACOTTA} />
            <Text style={styles.noteText}>
              This ticket is saved to your profile. To find it again, go to Profile → My Party Ticket. Show your QR code at the door on the night of the event.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const getStyles = createLazyStyles(() => ({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: RW_YELLOW_DIM,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: RW_YELLOW,
  },
  ticketCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2A1208',
    shadowColor: RW_TERRACOTTA,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  ticketTop: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  ticketEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(240,208,96,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  ticketEventName: {
    fontSize: 24,
    fontWeight: '900',
    color: RW_YELLOW,
    letterSpacing: -0.3,
  },
  ticketSubtitle: {
    fontSize: 12,
    color: 'rgba(240,208,96,0.6)',
    marginTop: 4,
  },
  tearLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG_DARK,
  },
  tearCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BG_DARK,
    marginLeft: -10,
  },
  tearDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(240,208,96,0.15)',
  },
  tearCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BG_DARK,
    marginRight: -10,
  },
  ticketBody: {
    padding: 24,
    gap: 16,
    backgroundColor: '#2A1208',
  },
  ticketRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ticketField: {
    gap: 4,
  },
  ticketFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(240,208,96,0.4)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  ticketFieldValue: {
    fontSize: 22,
    fontWeight: '800',
    color: RW_YELLOW,
  },
  ticketFieldValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: RW_YELLOW,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginTop: 4,
    borderWidth: 3,
    borderColor: RW_TERRACOTTA,
  },
  qrImage: {
    width: 230,
    height: 230,
  },
  qrInstructions: {
    textAlign: 'center',
    fontSize: 13,
    color: RW_YELLOW_DIM,
    marginTop: 2,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#052e16',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'center',
  },
  checkedInText: {
    fontSize: 13,
    color: '#4ade80',
    fontWeight: '600',
  },
  ticketFooter: {
    backgroundColor: '#1C0800',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 2,
  },
  ticketFooterText: {
    fontSize: 11,
    color: 'rgba(240,208,96,0.3)',
    textAlign: 'center',
  },
  noteCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(200,75,49,0.12)',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.25)',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: RW_YELLOW_DIM,
    lineHeight: 18,
  },
}));
