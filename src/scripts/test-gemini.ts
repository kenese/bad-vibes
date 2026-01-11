// Simple API test script to debug Gemini API issues
// Run with: npx ts-node src/scripts/test-gemini.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGeminiAPI() {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  console.log('=== Gemini API Test ===\n');
  
  // Check API key
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY is not set in environment');
    console.log('Make sure your .env file contains GOOGLE_API_KEY=your_key_here');
    return;
  }
  
  console.log('✓ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
  console.log('  Key length:', apiKey.length, 'characters\n');
  
  // List available models first
  console.log('Checking available models...');
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await response.json() as { models?: { name: string; displayName: string }[]; error?: { message: string } };
    
    if (data.error) {
      console.error('❌ Error listing models:', data.error.message);
      return;
    }
    
    console.log('✓ Available models:');
    const generativeModels = data.models?.filter(m => 
      m.name.includes('gemini') && !m.name.includes('embedding')
    ) ?? [];
    
    generativeModels.slice(0, 5).forEach(m => {
      console.log('  -', m.name, `(${m.displayName})`);
    });
    console.log('  ... and', generativeModels.length - 5, 'more\n');
  } catch (err) {
    console.error('❌ Failed to list models:', err);
  }
  
  // Try a minimal API call
  console.log('Testing API call with gemini-2.0-flash...');
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: 10 } // Minimal output
    });
    
    const result = await model.generateContent('Say "hello"');
    console.log('✓ API call succeeded!');
    console.log('  Response:', result.response.text());
  } catch (error) {
    console.error('❌ API call failed:');
    if (error instanceof Error) {
      // Parse the error for quota info
      const errorMsg = error.message;
      
      if (errorMsg.includes('429')) {
        console.log('\n📊 Rate Limit Details:');
        
        if (errorMsg.includes('PerDay') || errorMsg.includes('PerDayPerProject')) {
          console.log('  ⚠️  DAILY quota exceeded - resets at midnight Pacific Time');
        }
        if (errorMsg.includes('PerMinute')) {
          console.log('  ⚠️  Per-minute quota exceeded - wait 60 seconds');
        }
        
        // Check if limit is 0
        if (errorMsg.includes('limit: 0')) {
          console.log('\n  🔴 limit: 0 detected - this could mean:');
          console.log('     1. Daily quota fully exhausted');
          console.log('     2. API key needs billing enabled');
          console.log('     3. Project quota not configured');
          console.log('\n  Check your quota at: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas');
        }
        
        // Extract retry time
        const retryMatch = /retry.*?(\d+\.?\d*)/i.exec(errorMsg);
        if (retryMatch) {
          console.log('\n  Suggested retry: in', parseFloat(retryMatch[1]).toFixed(0), 'seconds');
        }
      } else if (errorMsg.includes('404')) {
        console.log('  Model not found - check model name');
      } else if (errorMsg.includes('403')) {
        console.log('  API key issue - check permissions');
      } else {
        console.log(' ', errorMsg);
      }
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testGeminiAPI().catch(console.error);
