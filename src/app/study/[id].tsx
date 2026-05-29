import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function StudyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useThemeColors();
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Validate study ID parameter securely
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      setErrorMsg('Content unavailable or removed.');
      return;
    }

    // Direct non-blocking client redirect to main screen study catalog
    const timer = setTimeout(() => {
      router.replace({ pathname: '/', params: { openStudy: id } });
    }, Platform.OS === 'web' ? 800 : 100);

    return () => clearTimeout(timer);
  }, [id]);

  const seoTitle = 'MCE Motihari Academic Study Materials & Syllabus';
  const seoDesc = 'Download verified lecture notes, semester syllabus PDFs, previous years question papers (PYQs), and laboratory manuals uploaded by MCE faculty & alumni.';
  const canonicalUrl = `https://mcemotihari-app.web.app/study/${id}`;

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
      <ActivityIndicator size="large" color="#3B82F6" />
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
