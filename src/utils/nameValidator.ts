/**
 * Utility functions for validating and cleaning MCE Connect user display names.
 * Enforces strict guidelines across frontend UI and store layers.
 */

/**
 * Trims and collapses multiple spaces into a single space.
 */
export function cleanDisplayName(name: string): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Validates a display name according to strict campus guidelines.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateDisplayName(name: string): string | null {
  if (!name || name.trim() === '') {
    return 'Display name is required.';
  }

  // 1. Enforce that the name must be already cleaned (no leading/trailing or multiple spaces)
  if (name !== cleanDisplayName(name)) {
    return 'Display name must not contain leading, trailing, or consecutive spaces.';
  }

  const cleaned = name;

  // 2. Character and Symbol Checks
  // Emojis/Symbols are any characters not in a-zA-Z, space, or dot
  if (!/^[a-zA-Z\s\.]+$/.test(cleaned)) {
    if (/[0-9]/.test(cleaned)) {
      return 'Numbers are not allowed.';
    }
    return 'Special characters are not allowed.';
  }

  // 3. Repeated Punctuation
  if (cleaned.includes('..')) {
    return 'Special characters are not allowed.';
  }

  // 4. Length check
  if (cleaned.length > 40) {
    return 'Display name must not exceed 40 characters.';
  }

  // Split into words
  const words = cleaned.split(' ');

  // 5. Minimum & Maximum words
  if (words.length < 2 || words.length > 4) {
    return 'Display name must contain 2-4 words.';
  }

  // 6. Title and Dot placement validation
  const allowedTitles = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'er'];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check dot presence
    if (word.includes('.')) {
      // Dot is ONLY allowed in the first word
      if (i !== 0) {
        return 'Special characters are not allowed.';
      }
      
      // First word with dot must be a valid title prefix
      const titleWithoutDot = word.slice(0, -1).toLowerCase();
      if (!allowedTitles.includes(titleWithoutDot) || word.split('.').length > 2 || !word.endsWith('.')) {
        return 'Only valid titles (Dr, Prof, Mr, Mrs, Ms, Er) are permitted.';
      }
    }
  }

  // 7. Duplicate word check (case-insensitive)
  const lowerWords = words.map(w => w.toLowerCase().replace(/\.$/, ''));
  const uniqueWords = new Set(lowerWords);
  if (uniqueWords.size !== lowerWords.length) {
    return 'Repeated words are not allowed.';
  }

  // 8. Gibberish check (repeated characters in a word, or common test patterns)
  const gibberishPatterns = ['aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff', 'ggg', 'xxx', 'yyy', 'zzz', 'abc', 'xyz', 'qwe', 'asd', 'zxc', 'test'];
  for (const w of lowerWords) {
    if (w.length >= 3) {
      // Three consecutive identical characters (e.g. "aaa")
      if (/(.)\1\1/.test(w)) {
        return 'Gibberish names are not allowed.';
      }
      // Common gibberish patterns
      if (gibberishPatterns.includes(w) || w === 'lmao' || w === 'haha' || w === 'admin' || w === 'guest') {
        return 'Gibberish names are not allowed.';
      }
    }
  }

  return null; // Valid!
}
