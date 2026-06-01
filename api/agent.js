// api/agent.js - Vercel Serverless Function (SSE Streaming)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_KEY) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write(`data: ${JSON.stringify({ text: '⚠️ ANTHROPIC_API_KEY not configured on Vercel environment. Please set it to activate Claude.' })}\n\n`);
    res.end();
    return;
  }

  try {
    const { message, address, history = [] } = req.body;

    const messages = [
      ...history
        .filter(m => m.content?.trim())
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        stream: true,
        system: `You are ELTNAM (the Mantle Ecosystem AI Copilot) — an elite guide for the Mantle L2 network (Chain ID: 5000). User wallet: ${address || 'Not connected'}. Be concise, data-backed, and risk-aware. Never expose API keys. Risk score every recommendation 1-10.`,
        messages,
      }),
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.write(JSON.stringify({ error: err.message }));
    res.end();
  }
}
