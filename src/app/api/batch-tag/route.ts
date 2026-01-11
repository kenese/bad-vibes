import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Allowed tags taxonomy
const GENRES = ['House', 'Techno', 'Disco', 'Tech', 'DnB', 'Breaks', 'Downtempo', 'Soul', 'Funk', 'Rap'];
const MOODS = ['Moody', 'Mellow', 'Dark', 'Driving', 'Euphoric', 'Raw', 'Hypnotic', 'Soulful', 'Peak-time', 'Smooth', 'Upbeat', 'Hard', 'Deep'];

const SYSTEM_PROMPT = `You are a music genre/mood classifier. Given a list of tracks with artist and title, classify each track with appropriate genre and mood tags.

ALLOWED GENRES (pick 1-2 that best fit): ${GENRES.join(', ')}

ALLOWED MOODS (pick 1-3 that best fit): ${MOODS.join(', ')}

RULES:
1. Only use tags from the allowed lists above
2. Be conservative - only tag if you're reasonably confident
3. For each track, return 2-4 tags total (genre + moods)
4. If you don't recognize a track, make your best guess based on artist style

INPUT FORMAT: Array of { id: string, artist: string, title: string }
OUTPUT FORMAT: JSON array of { id: string, tags: string[] }

Example input: [{"id": "abc123", "artist": "Kerri Chandler", "title": "Rain"}]
Example output: [{"id": "abc123", "tags": ["House", "Deep", "Soulful"]}]`;

interface TrackInput {
  id: string;
  artist: string;
  title: string;
}

interface TagResult {
  id: string;
  tags: string[];
}

// Use Flash-Lite for higher quota (~1000 requests/day on free tier)
const MODEL_NAME = 'gemini-flash-lite-latest';

async function callGemini(genAI: GoogleGenerativeAI, prompt: string): Promise<string> {
  console.log(`[BatchTag] Calling model: ${MODEL_NAME}`);
  
  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    }
  });
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  console.log(`[BatchTag] Model ${MODEL_NAME} succeeded`);
  return response.text();
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json() as { tracks: TrackInput[] };
    const { tracks } = body;

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: tracks array required' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Prepare input for the model
    const inputData = tracks.map(t => ({
      id: t.id,
      artist: t.artist || 'Unknown',
      title: t.title || 'Unknown'
    }));

    const prompt = `${SYSTEM_PROMPT}

Classify these tracks:
${JSON.stringify(inputData, null, 2)}`;

    const text = await callGemini(genAI, prompt);

    // Parse the JSON response
    let results: TagResult[];
    try {
      results = JSON.parse(text) as TagResult[];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, text);
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: text },
        { status: 500 }
      );
    }

    // Validate and filter tags to only allowed values
    const validatedResults = results.map(r => ({
      id: r.id,
      tags: (r.tags || []).filter(tag => 
        GENRES.includes(tag) || MOODS.includes(tag)
      )
    }));

    return NextResponse.json({ results: validatedResults });

  } catch (error) {
    console.error('Batch tag API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Return 429 for rate limit errors so frontend knows to wait
    if (message.includes('Rate limited')) {
      return NextResponse.json(
        { error: message, retryable: true },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: `AI tagging failed: ${message}` },
      { status: 500 }
    );
  }
}
