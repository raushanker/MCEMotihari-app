/**
 * High-performance emoji duplicate checker.
 * Checks if any single emoji character is repeated more than once inside a text.
 * Uses modern Unicode Property Escapes with a robust regex fallback.
 */
export function hasDuplicateEmojis(text: string): boolean {
  if (!text) return false;
  
  try {
    // \p{Emoji_Presentation} matches standard presentation emojis (e.g. 😂, 👍)
    const emojis = text.match(/\p{Emoji_Presentation}/gu) || [];
    const seen = new Set<string>();
    
    for (const emoji of emojis) {
      if (seen.has(emoji)) {
        return true;
      }
      seen.add(emoji);
    }
  } catch (e) {
    // Fallback regex for legacy JS environments if Unicode Property Escapes are unsupported
    const fallbackRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu;
    try {
      const emojis = text.match(fallbackRegex) || [];
      const seen = new Set<string>();
      
      for (const emoji of emojis) {
        if (seen.has(emoji)) {
          return true;
        }
        seen.add(emoji);
      }
    } catch (err) {
      // If regex completely fails, don't block normal user comments
      console.warn('Emoji validation regex error:', err);
    }
  }
  
  return false;
}
