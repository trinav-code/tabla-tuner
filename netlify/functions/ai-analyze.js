export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { pitches, positionReadings, raga, scale, recommendedNote, analysisType } = body;

    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    let prompt;
    
    if (analysisType === 'tension') {
      // Advanced tension analysis
      const positions = ['12', '3', '6', '9'];
      const freqs = positions.map(p => positionReadings[p]?.freq || 0);
      const avgFreq = freqs.reduce((a, b) => a + b, 0) / freqs.length;
      const deviations = freqs.map(f => Math.abs(f - avgFreq));
      const maxDeviation = Math.max(...deviations);
      
      // Calculate specific position differences
      const vertical = Math.abs(freqs[0] - freqs[2]); // 12 vs 6
      const horizontal = Math.abs(freqs[1] - freqs[3]); // 3 vs 9
      
      prompt = `You are a tabla tuning expert. Analyze this advanced tension check:

CONTEXT:
- Raga: ${raga}
- Singer's scale: ${scale}
- Recommended tabla tuning: ${recommendedNote.note} (${recommendedNote.sargam})
- Target frequency: ${recommendedNote.frequency.toFixed(2)} Hz

POSITION READINGS (2 seconds each):
- 12 o'clock: ${freqs[0].toFixed(2)} Hz (${positionReadings['12'].count} readings)
- 3 o'clock: ${freqs[1].toFixed(2)} Hz (${positionReadings['3'].count} readings)
- 6 o'clock: ${freqs[2].toFixed(2)} Hz (${positionReadings['6'].count} readings)
- 9 o'clock: ${freqs[3].toFixed(2)} Hz (${positionReadings['9'].count} readings)

TENSION ANALYSIS:
- Average frequency: ${avgFreq.toFixed(2)} Hz
- Maximum deviation from average: ${maxDeviation.toFixed(2)} Hz
- Vertical difference (12 vs 6): ${vertical.toFixed(2)} Hz
- Horizontal difference (3 vs 9): ${horizontal.toFixed(2)} Hz

ANALYSIS NEEDED:
1. Tension Balance: Are the straps evenly tensioned? (deviation >5 Hz is concerning)
2. Tuning Accuracy: How close is the average to the target frequency?
3. Specific Adjustments: Which positions need tightening or loosening?

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

🎯 Tension Balance: [Excellent/Good/Uneven/Poor] - [one sentence]
📊 Tuning: [On target/Close/Needs adjustment] - [distance from target]
🔧 Action Needed: [specific position adjustments]

Example:
"Tighten strap at 3 o'clock by 1/4 turn"
"Loosen strap at 12 o'clock slightly"

Keep it under 4 sentences total. Be specific and actionable.`;
    } else {
      // Quick analysis (original code)
      const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
      const variance = pitches.map(p => Math.abs(p - avgPitch));
      const maxVariation = Math.max(...variance);
      
      const firstHalf = pitches.slice(0, Math.floor(pitches.length / 2));
      const secondHalf = pitches.slice(Math.floor(pitches.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const drift = avgSecond - avgFirst;

      prompt = `You are a tabla tuning expert. Analyze this tabla sound check:

CONTEXT:
- Raga: ${raga}
- Singer's scale: ${scale}
- Recommended tabla tuning: ${recommendedNote.note} (${recommendedNote.sargam})
- Target frequency: ${recommendedNote.frequency.toFixed(2)} Hz

RECORDED DATA (10 seconds of playing):
- Average pitch: ${avgPitch.toFixed(2)} Hz
- Maximum variation: ${maxVariation.toFixed(2)} Hz
- Pitch drift: ${drift.toFixed(2)} Hz (${drift > 0 ? 'rising' : 'falling'})

ANALYSIS NEEDED:
1. Stability: Is the pitch holding steady or drifting? (drift > 2 Hz is concerning)
2. Consistency: Is the tension even? (variation > 15 Hz suggests uneven strap tension)
3. ONE specific recommendation for improvement

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

✅ Stability: [Good/Moderate/Poor] - [one sentence explanation]
✅ Consistency: [Excellent/Good/Moderate/Poor] - [one sentence explanation]
💡 Recommendation: [one specific action to take]

Keep it under 3 sentences total. Be direct and actionable.`;
    }

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
          content: prompt
        }],
        max_tokens: 200,
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
        analysis
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
