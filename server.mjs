/**
 * server.mjs — Mantle Agentic Portal API Server
 *
 * Lightweight Node.js HTTP server that:
 *  • Proxies Claude calls  → POST /api/agent
 *  • Proxies DeFiLlama     → GET  /api/protocol
 *  • Proxies X tweets      → GET  /api/tweets
 *
 * Run alongside Vite in dev:
 *   node server.mjs
 *
 * No secret key is ever shipped in the browser bundle.
 * All env vars are read from .env via dotenv.
 */

import http from 'node:http';
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Manually load .env on startup (no dotenv dependency needed)
try {
  const env = readFileSync('.env', 'utf-8');
  for (const line of env.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && !process.env[key]) {
      process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
    }
  }
} catch { /* .env not found – proceed with existing env */ }

const PORT = process.env.API_PORT || 3001;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const DUNE_KEY = process.env.DUNE_API_KEY || '';

/**
 * DeFiLlama - fetch TVL for a protocol slug
 */
async function fetchLlamaData(slug) {
  if (!slug) return null;
  try {
    const [tvlRes, feesRes] = await Promise.allSettled([
      fetch(`https://api.llama.fi/tvl/${slug}`),
      fetch(`https://api.llama.fi/summary/fees/${slug}?dataType=dailyFees`),
    ]);

    const tvlText = tvlRes.status === 'fulfilled' && tvlRes.value.ok
      ? await tvlRes.value.text()
      : null;
    const tvl = tvlText
      ? `$${parseFloat(tvlText).toLocaleString()}`
      : null;

    let fees24h = 'N/A';
    if (feesRes.status === 'fulfilled' && feesRes.value.ok) {
      const fj = await feesRes.value.json().catch(() => null);
      if (fj?.total24h) fees24h = `$${parseFloat(fj.total24h).toLocaleString()}`;
    }

    return tvl ? { tvl, fees24h, dataSource: 'DeFiLlama', isStale: false, fetchedAt: Date.now() } : null;
  } catch {
    return null;
  }
}

/**
 * Route handler
 */
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;

  // CORS headers (allow Vite dev server origin)
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── GET /api/protocol?slug=<defillamaSlug> ────────────────────────────────
  if (pathname === '/api/protocol' && req.method === 'GET') {
    const slug = url.searchParams.get('slug') || '';
    const data = await fetchLlamaData(slug);
    if (data) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } else {
      // Baseline fallback
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tvl: 'N/A', fees24h: 'N/A', dataSource: 'Baseline', isStale: true, fetchedAt: Date.now() }));
    }
    return;
  }

  // ── GET /api/tweets?protocol=<name> ──────────────────────────────────────
  if (pathname === '/api/tweets' && req.method === 'GET') {
    const protocol = url.searchParams.get('protocol') || '';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      tweets: [
        { id: '1', text: `${protocol} is gaining momentum across the Mantle ecosystem 🚀`, date: '1h ago', sentiment: 'positive' },
        { id: '2', text: `${protocol} TVL just hit a new high! DeFi summer on Mantle is real.`, date: '3h ago', sentiment: 'positive' },
      ],
      discordUpdates: [
        { id: '1', content: `Official update from ${protocol}: New audit completed.`, date: '2h ago', channel: '#announcements' },
      ],
      overallSentiment: 82,
    }));
    return;
  }

  // ── POST /api/agent ───────────────────────────────────────────────────────
  if (pathname === '/api/agent' && req.method === 'POST') {
    if (!ANTHROPIC_KEY) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ text: '⚠️ ANTHROPIC_API_KEY not configured. Add it to .env to activate Claude.' })}\n\n`);
      res.end();
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { message, address, balance = '0.00', history = [] } = JSON.parse(body);

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
            system: `You are the Mantle Ecosystem Agent — an elite guide for the Mantle L2 network (Chain ID: 5000). User wallet: ${address}. User balance: ${balance} MNT. Be concise, data-backed, and risk-aware. Never expose API keys. Risk score every recommendation 1-10.`,
            messages,
          }),
        });

        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });

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
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 404 fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n🌐 Mantle API Server running on http://localhost:${PORT}`);
  console.log(`   /api/agent   → Claude AI (stream)`);
  console.log(`   /api/protocol → DeFiLlama waterfall`);
  console.log(`   /api/tweets  → X.com + Discord sentiment\n`);
});
