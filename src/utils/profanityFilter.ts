export const BAD_WORDS = [
  'fuck', 'fucking', 'bitch', 'asshole', 'bastard', 'motherfucker', 
  'chutiya', 'madarchod', 'bhenchod', 'bsdk', 'bhosadike', 'gandu',
  'lodu', 'laude', 'lund', 'randi', 'sala', 'kutta', 'kaminey', 'harami',
  'dick', 'pussy', 'whore', 'slut', 'cunt', 'nigger', 'faggot'
];

export const containsProfanity = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  
  // Basic substring check or word boundary check
  for (const word of BAD_WORDS) {
    // Check if the exact bad word is present as a standalone word or part of a word
    if (lowerText.includes(word)) {
      // To be safer from false positives (like "assassin" containing "ass"),
      // we can use regex with word boundaries, but many abusive words are merged.
      // Given the bad words list, simple includes is usually okay for strict moderation.
      return true;
    }
  }
  
  return false;
};
