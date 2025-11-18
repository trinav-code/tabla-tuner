export async function handler(event, context) {
2  // Only allow POST requests
3  if (event.httpMethod !== 'POST') {
4    return {
5      statusCode: 405,
6      body: JSON.stringify({ error: 'Method not allowed' })
7    };
8  }
9
10  try {
11    const body = JSON.parse(event.body);
12    const { pitches, positionReadings, raga, scale, recommendedNote, analysisType } = body;
13
14    // Get API key from environment variable
15    const apiKey = process.env.OPENAI_API_KEY;
16
17    if (!apiKey) {
18      return {
19        statusCode: 500,
20        body: JSON.stringify({ error: 'API key not configured' })
21      };
22    }
23
24    let prompt;
25    
26    if (analysisType === 'tension') {
27      // Advanced tension analysis
28      const positions = ['12', '3', '6', '9'];
29      const freqs = positions.map(p => positionReadings[p]?.freq || 0);
30      const avgFreq = freqs.reduce((a, b) => a + b, 0) / freqs.length;
31      const deviations = freqs.map(f => Math.abs(f - avgFreq));
32      const maxDeviation = Math.max(...deviations);
33      
34      // Calculate specific position differences
35      const vertical = Math.abs(freqs[0] - freqs[2]); // 12 vs 6
36      const horizontal = Math.abs(freqs[1] - freqs[3]); // 3 vs 9
37      
38      prompt = `You are a tabla tuning expert. Analyze this advanced tension check:
39
40CONTEXT:
41- Raga: ${raga}
42- Singer's scale: ${scale}
43- Recommended tabla tuning: ${recommendedNote.note} (${recommendedNote.sargam})
44- Target frequency: ${recommendedNote.frequency.toFixed(2)} Hz
45
46POSITION READINGS (2 seconds each):
47- 12 o'clock: ${freqs[0].toFixed(2)} Hz (${positionReadings['12'].count} readings)
48- 3 o'clock: ${freqs[1].toFixed(2)} Hz (${positionReadings['3'].count} readings)
49- 6 o'clock: ${freqs[2].toFixed(2)} Hz (${positionReadings['6'].count} readings)
50- 9 o'clock: ${freqs[3].toFixed(2)} Hz (${positionReadings['9'].count} readings)
51
52TENSION ANALYSIS:
53- Average frequency: ${avgFreq.toFixed(2)} Hz
54- Maximum deviation from average: ${maxDeviation.toFixed(2)} Hz
55- Vertical difference (12 vs 6): ${vertical.toFixed(2)} Hz
56- Horizontal difference (3 vs 9): ${horizontal.toFixed(2)} Hz
57
58ANALYSIS NEEDED:
591. Tension Balance: Are the straps evenly tensioned? (deviation >5 Hz is concerning)
602. Tuning Accuracy: How close is the average to the target frequency?
613. Specific Adjustments: Which positions need tightening or loosening?
62
63FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
64
65🎯 Tension Balance: [Excellent/Good/Uneven/Poor] - [one sentence]
66📊 Tuning: [On target/Close/Needs adjustment] - [distance from target]
67🔧 Action Needed: [specific position adjustments]
68
69Example:
70"Tighten strap at 3 o'clock by 1/4 turn"
71"Loosen strap at 12 o'clock slightly"
72
73Keep it under 4 sentences total. Be specific and actionable.`;
74    } else {
75      // Quick analysis (original code)
76      const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
77      const variance = pitches.map(p => Math.abs(p - avgPitch));
78      const maxVariation = Math.max(...variance);
79      
80      const firstHalf = pitches.slice(0, Math.floor(pitches.length / 2));
81      const secondHalf = pitches.slice(Math.floor(pitches.length / 2));
82      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
83      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
84      const drift = avgSecond - avgFirst;
85
86      prompt = `You are a tabla tuning expert. Analyze this tabla sound check:
87
88CONTEXT:
89- Raga: ${raga}
90- Singer's scale: ${scale}
91- Recommended tabla tuning: ${recommendedNote.note} (${recommendedNote.sargam})
92- Target frequency: ${recommendedNote.frequency.toFixed(2)} Hz
93
94RECORDED DATA (10 seconds of playing):
95- Average pitch: ${avgPitch.toFixed(2)} Hz
96- Maximum variation: ${maxVariation.toFixed(2)} Hz
97- Pitch drift: ${drift.toFixed(2)} Hz (${drift > 0 ? 'rising' : 'falling'})
98
99ANALYSIS NEEDED:
1001. Stability: Is the pitch holding steady or drifting? (drift > 2 Hz is concerning)
1012. Consistency: Is the tension even? (variation > 15 Hz suggests uneven strap tension)
1023. ONE specific recommendation for improvement
103
104FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
105
106✅ Stability: [Good/Moderate/Poor] - [one sentence explanation]
107✅ Consistency: [Excellent/Good/Moderate/Poor] - [one sentence explanation]
108💡 Recommendation: [one specific action to take]
109
110Keep it under 3 sentences total. Be direct and actionable.`;
111    }
112
113    // Call OpenAI API
114    const response = await fetch('https://api.openai.com/v1/chat/completions', {
115      method: 'POST',
116      headers: {
117        'Content-Type': 'application/json',
118        'Authorization': `Bearer ${apiKey}`
119      },
120      body: JSON.stringify({
121        model: 'gpt-4o-mini',
122        messages: [{
123          role: 'user',
124          content: prompt
125        }],
126        max_tokens: 200,
127        temperature: 0.7
128      })
129    });
130
131    const data = await response.json();
132    
133    if (data.error) {
134      throw new Error(data.error.message);
135    }
136
137    const analysis = data.choices[0].message.content;
138
139    return {
140      statusCode: 200,
141      headers: {
142        'Content-Type': 'application/json',
143        'Access-Control-Allow-Origin': '*'
144      },
145      body: JSON.stringify({ 
146        analysis
147      })
148    };
149
150  } catch (error) {
151    console.error('Error:', error);
152    return {
153      statusCode: 500,
154      body: JSON.stringify({ 
155        error: 'Failed to analyze',
156        details: error.message 
157      })
158    };
159  }
160}
161
