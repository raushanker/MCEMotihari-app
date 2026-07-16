import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function HTML({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="referrer" content="no-referrer" />

        {/* Favicons & App Icons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
        <link rel="icon" type="image/png" href="/favicon.png?v=2" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png?v=2" />
        <link rel="manifest" href="/manifest.json?v=2" />

        {/* Apple Mobile Web App Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MCE Connect" />

        {/* Theme & Background Colors */}
        <meta name="theme-color" content="#0F172A" />

        {/* Primary SEO Meta Tags */}
        <title>MCE Connect - MCE Motihari Campus Hub</title>
        <meta name="description" content="Official community network of Motihari College of Engineering. Connect with alumni, get verified profile cards, read real-time campus notices, and access college study resources." />

        {/* OpenGraph / Facebook Previews */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="MCE Connect - Campus Hub & Community" />
        <meta property="og:description" content="Verified profile cards, real-time college notices, alumni connections, and academic resources for MCE Motihari." />
        <meta property="og:image" content="https://mcemotihari.com/assets/images/icon.png" />
        <meta property="og:url" content="https://mcemotihari.com" />

        {/* Twitter Previews */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MCE Connect - MCE Motihari Hub" />
        <meta name="twitter:description" content="Verified profile cards, real-time college notices, alumni connections, and academic resources." />
        <meta name="twitter:image" content="https://mcemotihari.com/assets/images/icon.png" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackgroundStyle + fontFaceStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const fontFaceStyle = `
@font-face {
  font-family: 'Ionicons';
  src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'Feather';
  src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype');
  font-display: swap;
}
`;

const responsiveBackgroundStyle = `
body {
  background-color: #F8FAFC;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #0F172A;
  }
}
`;
