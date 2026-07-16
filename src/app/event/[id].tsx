import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventsModal } from '@/components/modals/EventsModal';

interface CampusEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  category: string;
  desc: string;
}

const INITIAL_EVENTS: CampusEvent[] = [
  {
    id: 'evt-1',
    title: '💻 CSE CodeQuest Hackathon 2026',
    date: '12/06/2026 to 14/06/2026',
    time: '09:00 AM onwards (36 hrs)',
    venue: 'CSE Departmental Labs, MCE Campus',
    category: 'Hackathon',
    desc: 'Main College Hackathon. Compete to build software/hardware systems under 36 hours. Cash prizes and direct interviews!'
  },
  {
    id: 'evt-2',
    title: '🏏 BEU Inter-College Sports Meet',
    date: '28/05/2026 to 03/06/2026',
    time: '08:00 AM - 06:00 PM daily',
    venue: 'MCE Main Sports Complex & Ground',
    category: 'Sports',
    desc: 'University-level cricket, football, volleyball and athletic tournaments starting at MCE campus sports complexes.'
  },
  {
    id: 'evt-3',
    title: '🎙️ Placement Cell Alumni Mentor Interaction',
    date: '18/06/2026',
    time: '11:00 AM - 02:00 PM',
    venue: 'Main Auditorium, Academic Block-B',
    category: 'Seminar',
    desc: 'Chief technical seminar to connect students directly with hiring alumni mentors from TCS, Wipro, and Amazon.'
  },
  {
    id: 'evt-4',
    title: '🎨 Spandan Tech-Cultural Fest',
    date: '15/10/2026 to 18/10/2026',
    time: '10:00 AM - 09:00 PM',
    venue: 'MCE Cultural Lawn & Open Theatre',
    category: 'Cultural',
    desc: 'The annual flagship college festival of MCE Motihari. Celebrates engineering marvels and cultural arts.'
  }
];

export default function EventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useThemeColors();
  
  const [eventData, setEventData] = useState<CampusEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Validate route parameter securely
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      setErrorMsg('Event removed or not available.');
      setLoading(false);
      return;
    }

    const loadEvent = async () => {
      // Lightweight cache-first resolution of pre-populated events
      let found = INITIAL_EVENTS.find(e => e.id === id);

      if (!found) {
        try {
          const storedEvents = await AsyncStorage.getItem('@mce_campus_events');
          if (storedEvents) {
            const parsed = JSON.parse(storedEvents) as CampusEvent[];
            found = parsed.find(e => e.id === id);
          }
        } catch (err) {
          console.warn('Failed to parse stored events', err);
        }
      }

      if (found) {
        setEventData(found);
        setLoading(false);

        // Deep link analytics (lightweight local tracking placeholder)
        console.log('[Analytics] Opened event from deep link:', id);
        
      } else {
        router.replace({ pathname: '/content-unavailable', params: { type: 'Event' } });
      }
    };

    loadEvent();
  }, [id]);

  const seoTitle = eventData ? `${eventData.title} | MCE Connect` : 'MCE Motihari Campus Events';
  const seoDesc = eventData 
    ? `${eventData.desc.slice(0, 120)}... Venue: ${eventData.venue}. Join this event on MCE Connect.`
    : 'Join exciting college hackathons, sports fests, cultural events, and placement cell seminars on MCE Connect.';
  const canonicalUrl = `https://mcemotihari.com/event/${id}`;

  if (errorMsg) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>{errorMsg}</Text>
        <Text 
          style={styles.homeLink} 
          onPress={() => router.replace('/')}
        >
          Go back to Home Feed
        </Text>
      </View>
    );
  }

  if (loading || !eventData) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {Platform.OS === 'web' && (
        <Head>
          <title>{seoTitle}</title>
          <meta name="description" content={seoDesc} />
          <meta property="og:title" content={seoTitle} />
          <meta property="og:description" content={seoDesc} />
          <meta property="og:image" content="https://mcemotihari.com/assets/images/icon.png" />
          <meta property="og:url" content={canonicalUrl} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seoTitle} />
          <meta name="twitter:description" content={seoDesc} />
          <meta name="twitter:image" content="https://mcemotihari.com/assets/images/icon.png" />
          <link rel="canonical" href={canonicalUrl} />
        </Head>
      )}
      <EventsModal 
        isEmbedded 
        visible={true} 
        initialEventId={eventData.id} 
        onClose={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12
  },
  homeLink: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '700',
    textDecorationLine: 'underline'
  }
});
