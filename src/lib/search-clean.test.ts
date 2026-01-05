import { describe, it, expect } from 'vitest';
import { cleanSearchQuery } from './search-clean';

describe('cleanSearchQuery', () => {
  it('replaces hyphens with spaces', () => {
    expect(cleanSearchQuery('Jay-Z')).toBe('Jay Z');
    expect(cleanSearchQuery('semi-charmed life')).toBe('semi charmed life');
  });

  it('removes apostrophes and following characters in the word', () => {
    expect(cleanSearchQuery("You're")).toBe('You');
    expect(cleanSearchQuery("Don't Stop")).toBe('Don Stop');
    expect(cleanSearchQuery("It's Tricky")).toBe('It Tricky');
  });

  it('removes parenthetical blocks', () => {
    expect(cleanSearchQuery('Song Title (feat. Drake)')).toBe('Song Title');
    expect(cleanSearchQuery('Song Title [prod. by Metro]')).toBe('Song Title');
    expect(cleanSearchQuery('Title (Live) Version')).toBe('Title Version');
  });

  it('removes trailing featuring credits', () => {
    expect(cleanSearchQuery('Song Title ft. Drake')).toBe('Song Title');
    expect(cleanSearchQuery('Song Title feat. Someone')).toBe('Song Title');
    expect(cleanSearchQuery('Song Title featuring The Band')).toBe('Song Title');
  });

  it('normalizes whitespace', () => {
    expect(cleanSearchQuery('  Messy   Input  ')).toBe('Messy Input');
    expect(cleanSearchQuery('Word1  -  Word2')).toBe('Word1 Word2'); // Hyphen becomes space, then multi-space collapsed
  });

  it('handles complex combinations', () => {
    expect(cleanSearchQuery("Jay-Z - I'm A Hustler (Remix) ft. Beyonce")).toBe('Jay Z I A Hustler');
    // Breakdown:
    // "Jay-Z" -> "Jay Z"
    // " - " -> "   " -> " "
    // "I'm" -> "I"
    // "(Remix)" -> removed
    // "ft. Beyonce" -> removed
    // Result: "Jay Z I A Hustler"
  });
});
