export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { pitches, raga, scale, recommendedNote } = JSON.parse(event.body);

    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Calculate statistics
    const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.map(p => Math.abs(p - avgPitch));
    const maxVariation = Math.max(...variance);
    
    // Check for drift
    const firstHalf = pitches.slice(0, Math.floor(pitches.length / 2));
    const secondHalf = pitches.slice(Math.floor(pitches.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const drift = avgSecond - avgFirst;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `You are a tabla tuning expert. Analyze this tabla sound check:

CONTEXT:
- Raga: ${raga}
- Singer's scale: ${scale}
- Recommended tabla tuning: ${recommendedNote.note} (${recommendedNote.sargam})
- Target frequency: ${recommendedNote.frequency.toFixed(2)} Hz

RECORDED DATA (10 seconds of playing):
- Average pitch: ${avgPitch.toFixed(2)} Hz
- Maximum variation: ${maxVariation.toFixed(2)} cents
- Pitch drift: ${drift.toFixed(2)} Hz (${drift > 0 ? 'rising' : 'falling'})
- Individual pitches: ${pitches.map(p => p.toFixed(2)).join(', ')} Hz

ANALYSIS NEEDED:
1. Stability: Is the pitch holding steady or drifting? (drift > 2 Hz is concerning)
2. Consistency: Is the tension even? (variation > 15 cents suggests uneven strap tension)
3. ONE specific recommendation for improvement

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

✅ Stability: [Good/Moderate/Poor] - [one sentence explanation]
✅ Consistency: [Excellent/Good/Moderate/Poor] - [one sentence explanation]
💡 Recommendation: [one specific action to take]

Keep it under 3 sentences total. Be direct and actionable.`
        }],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const analysis = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        analysis,
        stats: {
          avgPitch: avgPitch.toFixed(2),
          maxVariation: maxVariation.toFixed(1),
          drift: drift.toFixed(2)
        }
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to analyze',
        details: error.message 
      })
    };
  }
}
