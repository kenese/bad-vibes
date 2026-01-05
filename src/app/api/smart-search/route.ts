import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cleanSearchQuery } from '~/lib/search-clean';
import { AiExpansionService } from '~/services/ai-service';

// Environment variables
const SLSKD_URL = process.env.SLSKD_URL;
const SLSKD_API_KEY = process.env.SLSKD_API_KEY;

// Validation Schema
const searchSchema = z.object({
  query: z.string().min(1, "Query is required"),
  action: z.enum(['preview', 'execute']).optional().default('preview'),
});



// Helper: Call Slskd
async function triggerSlskdSearch(query: string, source: string): Promise<boolean> {
  if (!SLSKD_URL || !SLSKD_API_KEY) {
    console.error('Slskd configuration missing');
    return false;
  }

  const searchId = crypto.randomUUID();
  console.log(`[SmartSearch] Triggering search id=${searchId} query="${query}" source=${source}`);

  try {
    const res = await fetch(`${SLSKD_URL}/api/v0/searches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': SLSKD_API_KEY
      },
      body: JSON.stringify({
        searchText: query
      })
    });

    if (!res.ok) {
        console.error(`[SmartSearch] Slskd Error ${res.status}: ${res.statusText}`);
        return false;
    }
    return true;
  } catch (e) {
    console.error('[SmartSearch] Failed to call Slskd:', e);
    return false;
  }
}



export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const result = searchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { query, action } = result.data;

    // EXECUTE MODE: Trigger Slskd immediately
    if (action === 'execute') {
      const success = await triggerSlskdSearch(query, 'manual_execute');
      if (success) {
        return NextResponse.json({ success: true, message: 'Search triggered' });
      } else {
        return NextResponse.json({ error: 'Failed to trigger search' }, { status: 502 });
      }
    }

    // PREVIEW MODE: Generate variations only
    const results: { q: string, type: 'Original' | 'Cleaned' | 'AI' }[] = [];

    // 1. Original
    results.push({ q: query, type: 'Original' });

    // 2. Cleaned
    const cleanedQuery = cleanSearchQuery(query);
    if (cleanedQuery !== query && cleanedQuery.length > 0) {
      results.push({ q: cleanedQuery, type: 'Cleaned' });
    }

    // 3. AI Expansion (Awaited for Preview)
    try {
        const aiVariations = await AiExpansionService.expandQuery(query);
        if (aiVariations && aiVariations.length > 0) {
            aiVariations.forEach(v => {
                // Deduplicate
                if (v !== query && v !== cleanedQuery) {
                    results.push({ q: v, type: 'AI' });
                }
            });
        }
    } catch (e) {
        console.warn('[SmartSearch] AI expansion failed safely:', e);
        // Continue without AI results
    }

    return NextResponse.json({ 
        success: true, 
        results
    });

  } catch (error) {
    console.error('[SmartSearch] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
