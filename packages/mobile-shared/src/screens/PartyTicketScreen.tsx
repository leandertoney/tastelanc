import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
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

export default function PartyTicketScreen({ navigation, route }: Props) {
  const { qr_token, name: rsvpName } = route.params;
  const colors = getColors();
  const { market } = useMarket();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);

  const apiBase = market?.api_base_url ?? 'https://tastelanc.com';

  useEffect(() => {
    fetch(`${apiBase}/api/party/ticket/${qr_token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ticket) setTicket(data.ticket);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [qr_token, apiBase]);

  // QR code image URL — constructed from the token, rendered by a public QR service
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(qr_token)}`;

  const eventDate = ticket?.event
    ? new Date(ticket.event.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Monday, April 20, 2026';

  const displayName = ticket?.name ?? rsvpName ?? '';
  const eventName = ticket?.event?.name ?? 'TasteLanc Launch Party';
  const venue = ticket?.event?.venue ?? 'Hemp Field Apothecary Lounge';
  const address = ticket?.event?.address ?? '342 N Queen St, Lancaster, PA 17603';

  const styles = getStyles();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.primary }]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading your ticket...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      <LinearGradient
        colors={[colors.primary, '#1A0800']}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your Ticket</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Ticket card */}
          <View style={styles.ticketCard}>
            {/* Ticket top */}
            <LinearGradient
              colors={['#C84B31', '#a03a24']}
              style={styles.ticketTop}
            >
              <Text style={styles.ticketEventName}>{eventName}</Text>
              <Text style={styles.ticketVenue}>{venue}</Text>
            </LinearGradient>

            {/* Tear line */}
            <View style={styles.tearLine}>
              <View style={styles.tearCircleLeft} />
              <View style={styles.tearDash} />
              <View style={styles.tearCircleRight} />
            </View>

            {/* Ticket body */}
            <View style={styles.ticketBody}>
              {/* Name */}
              <View style={styles.ticketField}>
                <Text style={styles.ticketFieldLabel}>NAME</Text>
                <Text style={styles.ticketFieldValue}>{displayName}</Text>
              </View>

              {/* Date + Venue row */}
              <View style={styles.ticketRow}>
                <View style={[styles.ticketField, { flex: 1 }]}>
                  <Text style={styles.ticketFieldLabel}>DATE</Text>
                  <Text style={styles.ticketFieldValueSmall}>Monday, April 20</Text>
                </View>
                <View style={[styles.ticketField, { flex: 1 }]}>
                  <Text style={styles.ticketFieldLabel}>TIME</Text>
                  <Text style={styles.ticketFieldValueSmall}>7:00 PM</Text>
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

              <Text style={styles.qrInstructions}>
                Show this QR code at the door
              </Text>

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
              <Text style={styles.ticketFooterText}>App-exclusive entry · TasteLanc</Text>
            </View>
          </View>

          {/* Save to profile note */}
          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <Text style={styles.noteText}>
              This ticket is saved to your profile. Come back here on the night of the event to show your QR code.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const getStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
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
      color: colors.text,
    },
    ticketCard: {
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: '#1E1E1E',
      shadowColor: '#C84B31',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    ticketTop: {
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    ticketEventName: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -0.3,
    },
    ticketVenue: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
    },
    tearLine: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: -20,
    },
    tearCircleLeft: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      marginLeft: -10,
    },
    tearDash: {
      flex: 1,
      height: 1,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: '#444',
    },
    tearCircleRight: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      marginRight: -10,
    },
    ticketBody: {
      padding: 24,
      gap: 16,
      backgroundColor: '#1E1E1E',
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
      color: '#888',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    ticketFieldValue: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
    },
    ticketFieldValueSmall: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    qrContainer: {
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 4,
      marginTop: 8,
    },
    qrImage: {
      width: 240,
      height: 240,
    },
    qrInstructions: {
      textAlign: 'center',
      fontSize: 13,
      color: '#888',
      marginTop: 4,
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
      backgroundColor: '#161616',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 2,
    },
    ticketFooterText: {
      fontSize: 11,
      color: '#555',
      textAlign: 'center',
    },
    noteCard: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      backgroundColor: colors.accent + '15',
      borderRadius: 14,
      padding: 14,
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.accent + '30',
    },
    noteText: {
      flex: 1,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
  };
});
