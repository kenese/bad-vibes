export const cleanSearchQuery = (input: string): string => {
  let cleaned = input;

  // 1. Remove parentheticals (e.g., "(feat. Drake)", "[prod. by X]")
  // Matches content inside () or []
  cleaned = cleaned.replace(/\s*[\(\[].*?[\)\]]/g, '');

  // 2. Remove trailing features (e.g., "ft. Drake", "feat. Drake", "featuring Drake")
  // Case insensitive, matching at the end of the string or followed by end of line
  // We handle "ft.", "feat.", "featuring" followed by anything
  cleaned = cleaned.replace(/\s+(?:ft\.|feat\.|featuring)\s+.*$/i, '');

  // 3. Special Characters
  // Replace hyphens with spaces
  cleaned = cleaned.replace(/-/g, ' ');

  // Handle apostrophes: remove the rest of the word
  // e.g. "You're" -> "You", "Don't" -> "Don", "It's" -> "It"
  // Look for a word boundary or character, then apostrophe, then remaining word characters
  cleaned = cleaned.replace(/(\w+)'\w+/g, '$1');

  // 4. Normalize Whitespace
  // Replace multiple spaces with single space and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};
