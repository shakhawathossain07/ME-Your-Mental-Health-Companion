// Netlify Serverless Function for Gemini API Proxy
export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const model = (body.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const contents = body.contents;

    if (!Array.isArray(contents) || contents.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request: contents[] is required' })
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: body.generationConfig ?? {
          temperature: 0.7,
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 150
        },
        safetySettings: body.safetySettings ?? [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      })
    });

    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'gemini_error', status: response.status, details: json ?? text })
      };
    }

    const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Invalid Gemini response format', details: json })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: candidateText })
    };

  } catch (err) {
    console.error('Gemini function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Server error' })
    };
  }
}

// Fetch with retry for rate limiting
async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status !== 429 && response.status < 500) {
      return response;
    }
    
    if (attempt === retries) return response;
    
    const retryAfter = Number(response.headers.get('retry-after'));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 
      ? retryAfter * 1000 
      : backoff * Math.pow(2, attempt);
    
    await new Promise(r => setTimeout(r, wait));
  }
}
