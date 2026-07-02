// Basic list of offensive/abusive words (Hindi + English)
const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'motherfucker', 'whore', 'slut', 'faggot',
  'madarchod', 'behenchod', 'chutiya', 'bhosadike', 'bhosdi', 'gandu', 'randi', 'harami', 'kamina', 'sala', 'kutta',
  'suar', 'haramkhor'
];

export const containsProfanity = (text: string): boolean => {
  if (!text) return false;
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalizedText.split(/\s+/);
  
  for (const word of words) {
    if (PROFANITY_LIST.includes(word)) {
      return true;
    }
  }
  return false;
};

export const isSpam = (
  currentText: string, 
  previousText: string | null, 
  spamCount: number
): { isSpam: boolean; reason?: string; newSpamCount: number } => {
  const text = currentText.trim();
  
  // Rule 1: Check for excessive repetition of the exact same character/emoji (e.g. > 10 times)
  const repetitionRegex = /(.)\1{10,}/;
  if (repetitionRegex.test(text)) {
    return { isSpam: true, reason: 'Too many repeated characters or emojis.', newSpamCount: spamCount };
  }
  
  // Rule 2: Check for exact same message repeated consecutively
  if (previousText && text.toLowerCase() === previousText.toLowerCase()) {
    if (spamCount >= 4) { // Allow 4 identical messages, 5th is spam
      return { isSpam: true, reason: 'You are sending the same message too many times.', newSpamCount: spamCount + 1 };
    }
    return { isSpam: false, newSpamCount: spamCount + 1 };
  }

  // Reset spam count if message is different
  return { isSpam: false, newSpamCount: 0 };
};

export interface TextSegment {
  type: 'text' | 'link';
  content: string;
}

export const parseTextForLinks = (text: string): TextSegment[] => {
  if (!text) return [];
  // Basic URL regex matching http, https, or www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.filter(Boolean).map(part => {
    if (urlRegex.test(part)) {
      // Basic validation: must have at least one dot and some characters after it
      if (part.includes('.') && part.length > 5) {
        return { type: 'link', content: part };
      }
    }
    return { type: 'text', content: part };
  });
};
