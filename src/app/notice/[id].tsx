import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '@/hooks/useThemeColors';

interface NoticeItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
}

export default function NoticeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useThemeColors();
  
  const [noticeData, setNoticeData] = useState<NoticeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Validate route parameter securely to prevent injection attempts
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_\.-]+$/.test(id)) {
      setErrorMsg('Content unavailable or removed.');
      setLoading(false);
      return;
    }

    const loadCache = async () => {
      try {
        // Look up inside local cache-first notice pools
        const colCacheStr = await AsyncStorage.getItem('@mce_notices_v2');
        const uniCacheStr = await AsyncStorage.getItem('@mce_university_notices_v2');
        
        let match: NoticeItem | undefined;
        
        if (colCacheStr) {
          const colNotices: NoticeItem[] = JSON.parse(colCacheStr);
          match = colNotices.find(n => n.id === id);
        }
        
        if (!match && uniCacheStr) {
          const uniNotices: NoticeItem[] = JSON.parse(uniCacheStr);
          match = uniNotices.find(n => n.id === id);
        }
        
        if (match) {
          setNoticeData(match);
        }
        
        setLoading(false);
        
        // Dynamic non-blocking redirect to notice board with param
        const timer = setTimeout(() => {
          router.replace({ pathname: '/notice', params: { openNotice: id } });
        }, Platform.OS === 'web' ? 800 : 100);
        
        return () => clearTimeout(timer);
      } catch (err) {
        console.warn('Failed to resolve notice deep link from cache:', err);
        setLoading(false);
        router.replace('/notice');
      }
    };

    loadCache();
  }, [id]);

  const seoTitle = noticeData ? `📌 Notice: ${noticeData.title} | MCE Motihari` : 'MCE Motihari Official Notice Board';
  const seoDesc = noticeData 
    ? `${noticeData.snippet.slice(0, 120)}... PubDate: ${noticeData.pubDate}. Read full official circular on MCE Connect.`
    : 'Read live Bihar Engineering University (BEU) Patna notifications, examination circulars, placements, and holiday updates on MCE Connect.';
  const canonicalUrl = `https://mcemotihari-app.web.app/notice/${id}`;

  if (errorMsg) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>{errorMsg}</Text>
        <Text 
          style={styles.homeLink} 
          onPress={() => router.replace('/notice')}
        >
          Go back to Notices Hub
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      {Platform.OS === 'web' && (
        <Head>
          <title>{seoTitle}</title>
          <meta name="description" content={seoDesc} />
          <meta property="og:title" content={seoTitle} />
          <meta property="og:description" content={seoDesc} />
          <meta property="og:image" content="https://mcemotihari-app.web.app/assets/images/icon.png" />
          <meta property="og:url" content={canonicalUrl} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seoTitle} />
          <meta name="twitter:description" content={seoDesc} />
          <meta name="twitter:image" content="https://mcemotihari-app.web.app/assets/images/icon.png" />
          <link rel="canonical" href={canonicalUrl} />
        </Head>
      )}
      <ActivityIndicator size="large" color="#F97316" />
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
    color: '#F97316',
    fontWeight: '700',
    textDecorationLine: 'underline'
  }
});
