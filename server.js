import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '1mb' }));

// Serve static frontend
app.use(express.static(__dirname));

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    const err = new Error(`Missing required environment variable: ${name}`);
    err.status = 500;
    throw err;
  }
  return v;
}

async function fetchWithBackoff(url, options, { retries = 3, backoffMs = 1000 } = {}) {
  let lastResponse;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    lastResponse = res;

    if (res.status !== 429 && res.status < 500) return res;
    if (attempt === retries) return res;

    const retryAfter = Number(res.headers.get('retry-after'));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, wait));
  }
  return lastResponse;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Gemini proxy
app.post('/api/gemini', async (req, res) => {
  console.log('Received Gemini request');
  try {
    const apiKey = requireEnv('GEMINI_API_KEY');
    const model = (req.body?.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim();
    console.log(`Using model: ${model}`);
    
    const contents = req.body?.contents;

    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ error: 'Invalid request: contents[] is required' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    console.log('Forwarding to Gemini API...');
    const upstream = await fetchWithBackoff(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: req.body?.generationConfig ?? {
          temperature: 0.7,
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 150 // Optimized: Reduced from 200 to save output tokens
        },
        safetySettings: req.body?.safetySettings ?? [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      })
    }, { retries: 3, backoffMs: 1000 });

    console.log(`Gemini upstream status: ${upstream.status}`);

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    if (!upstream.ok) {
      console.error('Gemini upstream error:', text);
      return res.status(upstream.status).json({
        error: 'gemini_error',
        status: upstream.status,
        details: json ?? text
      });
    }

    const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      console.error('Invalid Gemini response format:', JSON.stringify(json, null, 2));
      return res.status(502).json({ error: 'Invalid Gemini response format', details: json });
    }

    console.log('Gemini response success');
    res.json({ text: candidateText });
  } catch (err) {
    console.error('Server error in /api/gemini:', err);
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || 'Server error' });
  }
});

// ElevenLabs TTS proxy
app.post('/api/tts', async (req, res) => {
  console.log('Received TTS request');
  try {
    const apiKey = requireEnv('ELEVENLABS_API_KEY');
    const voiceId = (req.body?.voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').trim();
    const text = (req.body?.text || '').toString().trim();
    console.log(`TTS text length: ${text.length}, voiceId: ${voiceId}`);

    if (!text) return res.status(400).json({ error: 'Invalid request: text is required' });

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;

    console.log('Forwarding to ElevenLabs API...');
    const upstream = await fetchWithBackoff(url, {
      method: 'POST',
      headers: {
        accept: 'audio/mpeg',
        'content-type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5', // Fast & efficient model
        output_format: 'mp3_22050_32', // Lower quality = smaller file = faster
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5 // Reduced for faster generation
        }
      })
    }, { retries: 1, backoffMs: 500 }); // Fewer retries to save credits on failures

    console.log(`ElevenLabs upstream status: ${upstream.status}`);

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('ElevenLabs upstream error:', detail);
      return res.status(upstream.status).json({ error: 'elevenlabs_error', status: upstream.status, details: detail });
    }

    console.log('ElevenLabs response success');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('content-type', 'audio/mpeg');
    res.setHeader('cache-control', 'no-store');
    res.send(buf);
  } catch (err) {
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || 'Server error' });
  }
});

// SPA-ish fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`ME server running on http://localhost:${port}`);
});
