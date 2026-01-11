/**
 * Track Matching Service
 * 
 * Provides fuzzy string matching to compare tracks between different collections
 * (Plex, Traktor, Discogs).
 */

export interface NormalizedTrack {
  id: string;
  artist: string;
  title: string;
  album?: string;
  originalArtist: string;
  originalTitle: string;
}

export interface MatchResult {
  sourceTrack: NormalizedTrack;
  targetTrack: NormalizedTrack | null;
  confidence: number; // 0-100
  matchType: 'exact' | 'fuzzy' | 'none';
}

export interface ComparisonResult {
  matched: MatchResult[];
  missingFromTarget: NormalizedTrack[];
  missingFromSource: NormalizedTrack[];
  stats: {
    totalSource: number;
    totalTarget: number;
    matchedCount: number;
    missingFromTargetCount: number;
    missingFromSourceCount: number;
  };
}

/**
 * Normalize a string for comparison:
 * - Lowercase
 * - Remove special characters
 * - Remove common prefixes/suffixes (feat., remix, etc.)
 * - Collapse whitespace
 */
function normalizeString(str: string): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    // Remove parenthetical content like (feat. X), (Remix), (Original Mix)
    .replace(/\s*\([^)]*\)/g, '')
    // Remove bracket content like [feat. X], [Remix]
    .replace(/\s*\[[^\]]*\]/g, '')
    // Remove "feat." and similar
    .replace(/\b(feat\.?|ft\.?|featuring)\b.*/gi, '')
    // Remove special characters except spaces
    .replace(/[^\w\s]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Calculate similarity percentage between two strings (0-100)
 */
function similarity(a: string, b: string): number {
  if (a === b) return 100;
  if (a.length === 0 || b.length === 0) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Calculate match confidence between two tracks
 * Returns a score from 0-100
 */
function calculateMatchConfidence(
  track1: NormalizedTrack,
  track2: NormalizedTrack
): number {
  // Normalize both artist and title
  const artist1 = normalizeString(track1.artist);
  const artist2 = normalizeString(track2.artist);
  const title1 = normalizeString(track1.title);
  const title2 = normalizeString(track2.title);

  // Check for exact match
  if (artist1 === artist2 && title1 === title2) {
    return 100;
  }

  // Calculate similarity for each component
  const artistSimilarity = similarity(artist1, artist2);
  const titleSimilarity = similarity(title1, title2);

  // Weight title more heavily (60%) than artist (40%)
  // because titles are more distinctive
  const weightedScore = (titleSimilarity * 0.6) + (artistSimilarity * 0.4);

  // Bonus if artist contains the other or vice versa
  let bonus = 0;
  if (artist1.includes(artist2) || artist2.includes(artist1)) {
    bonus += 10;
  }
  if (title1.includes(title2) || title2.includes(title1)) {
    bonus += 10;
  }

  return Math.min(100, Math.round(weightedScore + bonus));
}

/**
 * Find the best match for a track in a list of candidates
 */
function findBestMatch(
  track: NormalizedTrack,
  candidates: NormalizedTrack[],
  threshold = 70
): { match: NormalizedTrack | null; confidence: number } {
  let bestMatch: NormalizedTrack | null = null;
  let bestConfidence = 0;

  for (const candidate of candidates) {
    const confidence = calculateMatchConfidence(track, candidate);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = candidate;
    }
  }

  // Only return if above threshold
  if (bestConfidence >= threshold) {
    return { match: bestMatch, confidence: bestConfidence };
  }

  return { match: null, confidence: 0 };
}

/**
 * Compare two track collections and find matches/missing tracks
 */
export function compareTracks(
  sourceTracks: NormalizedTrack[],
  targetTracks: NormalizedTrack[],
  threshold = 70
): ComparisonResult {
  const matched: MatchResult[] = [];
  const missingFromTarget: NormalizedTrack[] = [];
  const matchedTargetIds = new Set<string>();

  // For each source track, try to find a match in target
  for (const sourceTrack of sourceTracks) {
    const { match, confidence } = findBestMatch(sourceTrack, targetTracks, threshold);
    
    if (match) {
      matched.push({
        sourceTrack,
        targetTrack: match,
        confidence,
        matchType: confidence === 100 ? 'exact' : 'fuzzy',
      });
      matchedTargetIds.add(match.id);
    } else {
      missingFromTarget.push(sourceTrack);
    }
  }

  // Find tracks in target that weren't matched
  const missingFromSource = targetTracks.filter(t => !matchedTargetIds.has(t.id));

  return {
    matched,
    missingFromTarget,
    missingFromSource,
    stats: {
      totalSource: sourceTracks.length,
      totalTarget: targetTracks.length,
      matchedCount: matched.length,
      missingFromTargetCount: missingFromTarget.length,
      missingFromSourceCount: missingFromSource.length,
    },
  };
}

// Export utility functions for testing
export { normalizeString, similarity, calculateMatchConfidence };
