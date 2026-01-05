import { env } from "~/env";

interface AiExpansionResponse {
  variations: string[];
}

export class AiExpansionService {
  private static readonly TIMEOUT_MS = 2000;
  private static readonly SYSTEM_PROMPT = `
    You are a search query expander. 
    Your goal is to provide 1-3 synonyms or related search terms for the given music query to help find the song/artist.
    Return ONLY a JSON object with a single key "variations" containing an array of strings.
    Do not output markdown or explanations.
    Example Input: "Jay-Z"
    Example Output: { "variations": ["Jay Z", "Shawn Carter"] }
  `;

  static async expandQuery(query: string): Promise<string[]> {
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<string[]>((_, reject) => {
        setTimeout(() => reject(new Error('AI Service Timeout')), this.TIMEOUT_MS);
      });

      // The actual AI call
      const fetchPromise = this.callAiProvider(query);

      // Race against timeout
      const variations = await Promise.race([fetchPromise, timeoutPromise]);
      return variations;
    } catch (error) {
      console.error('AI Expansion failed or timed out:', error);
      return []; // Fail safe, return empty array
    }
  }

  private static async callAiProvider(query: string): Promise<string[]> {
    // Determine provider based on env vars, default to Ollama structure if local AI URL is widely used, 
    // or OpenAI if key is present. For this robust implementation, we'll implement a generic fetch 
    // that fits OpenAI-compatible APIs (like Ollama, LocalAI, vLLM).

    const apiUrl = process.env.AI_API_URL || 'http://localhost:11434/v1/chat/completions';
    const apiKey = process.env.AI_API_KEY || 'ollama'; // Ollama often doesn't need a key vs OpenAI

    const body = {
      model: process.env.AI_MODEL || 'llama3', // Default to a common open model
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: query }
      ],
      temperature: 0.3, // Low temp for deterministic synonyms
      response_format: { type: "json_object" } // Enforce JSON if supported
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { choices: { message: { content: string } }[] };
      const content = data.choices?.[0]?.message?.content;

      if (!content) return [];

      try {
        const parsed = JSON.parse(content) as AiExpansionResponse;
        if (Array.isArray(parsed.variations)) {
            // Filter out exact match to original query to save requests
            return parsed.variations.filter(v => v.toLowerCase() !== query.toLowerCase());
        }
        return [];
      } catch (parseError) {
        console.error('Failed to parse AI JSON response:', content);
        return [];
      }

    } catch (e) {
      // Re-throw to be caught by race
      throw e;
    }
  }
}
