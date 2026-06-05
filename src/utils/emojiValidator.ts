/**
 * High-performance emoji duplicate checker.
 * Checks if any single emoji character is repeated more than once inside a text.
 * Uses modern Unicode Property Escapes with a robust regex fallback.
 */
export function hasDuplicateEmojis(text: string): boolean {
  if (!text) return false;
  
  try {
    // \p{Emoji_Presentation} matches standard presentation emojis (e.g. 😂, 👍)
    const singleEmojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u;
    const textChars = Array.from(text);
    let consecutiveCount = 1;
    
    for (let i = 1; i < textChars.length; i++) {
      const char = textChars[i];
      if (char === textChars[i - 1] && singleEmojiRegex.test(char)) {
        consecutiveCount++;
        if (consecutiveCount > 5) {
          return true;
        }
      } else {
        consecutiveCount = 1;
      }
    }
  } catch (e) {
    // Fallback regex for legacy JS environments if Unicode Property Escapes are unsupported
    const fallbackRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/u;
    try {
      const textChars = Array.from(text);
      let consecutiveCount = 1;
      
      for (let i = 1; i < textChars.length; i++) {
        const char = textChars[i];
        if (char === textChars[i - 1] && fallbackRegex.test(char)) {
          consecutiveCount++;
          if (consecutiveCount > 5) {
            return true;
          }
        } else {
          consecutiveCount = 1;
        }
      }
    } catch (err) {
      console.warn('Emoji validation fallback error:', err);
    }
  }
  
  return false;
}
