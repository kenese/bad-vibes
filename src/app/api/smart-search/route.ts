import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cleanSearchQuery } from '~/lib/search-janitor';
import { AiExpansionService } from '~/services/ai-service';

// Environment variables
const SLSKD_URL = process.env.SLSKD_URL;
const SLSKD_API_KEY = process.env.SLSKD_API_KEY;

// Validation Schema
const searchSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

interface SlskdSearchPayload {
  id: string; // We'll generate a UUID for tracking
  searchText: string;
}

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
        id: searchId,
        searchText: query
      } as SlskdSearchPayload)
    });

    if (!res.ok) {
        console.error(`[SmartSearch] Slskd Error ${res.status}: ${res.statusText}`);
        console.error(`Request:`, `${SLSKD_URL}/api/v0/searches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SLSKD_API_KEY
      },
      body: JSON.stringify({
        id: searchId,
        searchText: query
      } as SlskdSearchPayload)
    }, );
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
    const body = await req.json();
    const result = searchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const originalQuery = result.data.query;
    const searchTasks: Promise<boolean>[] = [];
    const triggeredQueries: string[] = [];

    // 1. Trigger Original Search
    searchTasks.push(triggerSlskdSearch(originalQuery, 'original').then(success => {
        if (success) triggeredQueries.push(originalQuery);
        return success;
    }));

    // 2. Janitor Search
    const cleanedQuery = cleanSearchQuery(originalQuery);
    if (cleanedQuery !== originalQuery && cleanedQuery.length > 0) {
      searchTasks.push(triggerSlskdSearch(cleanedQuery, 'janitor').then(success => {
        if (success) triggeredQueries.push(cleanedQuery);
        return success;
      }));
    }

    // 3. AI Expansion (Background)
    // We don't await this for the response, but we trigger it. 
    // Wait, Vercel/Serverless functions might kill the process if we don't await. 
    // To be safe in Next.js App Router (which supports streaming/background work better but still risky on serverless), 
    // we SHOULD mostly await or use `waitUntil` (Next.js 15 / Vercel spec). 
    // Ideally we race or just await it effectively since prompt is fast-ish.
    // The requirement said "parallel/background". 
    // We'll fire it and await `allSettled` to report back what happened, 
    // OR we trigger it and return early? If we return early, λ dies.
    // We will await it, but strictly bounded by the 2s timeout in AiService.

    // const aiPromise = AiExpansionService.expandQuery(originalQuery).then(async (variations) => {
    //     if (variations.length > 0) {
    //         console.log(`[SmartSearch] AI suggested: ${variations.join(', ')}`);
    //         const subTasks = variations.map(v => triggerSlskdSearch(v, 'ai'));
    //         await Promise.all(subTasks);
    //         triggeredQueries.push(...variations);
    //     }
    // });
    
    // // We'll add AI task to our main wait list to ensure it runs before response sends
    // // (preserving the "serverless" execution model)
    // searchTasks.push(aiPromise.then(() => true));

    await Promise.allSettled(searchTasks);

    return NextResponse.json({ 
        success: true, 
        triggered: triggeredQueries,
        cleaned: cleanedQuery !== originalQuery ? cleanedQuery : null 
    });

  } catch (error) {
    console.error('[SmartSearch] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
