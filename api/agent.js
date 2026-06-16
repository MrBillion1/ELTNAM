// api/agent.js - Vercel Serverless Function (SSE Streaming)

import { streamAnthropicCall } from './_agentCore.js';

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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ text: 'ANTHROPIC_API_KEY is not configured on Vercel. Add it to activate Claude.' })}\n\n`);
    res.end();
    return;
  }

  try {
    const { message, address, balance = '0.00', history = [] } = req.body;
    const messages = [
      ...history
        .filter((m) => m.content?.trim())
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const systemPrompt = [
      'You are ELTNAM, the Mantle Ecosystem AI Copilot for Mantle L2 (Chain ID: 5000).',
      `User wallet: ${address || 'Not connected'}. User balance: ${balance} MNT.`,
      'Be concise, data-backed, and risk-aware. Never expose API keys.',
      'Use LI.FI bridge tools for cross-chain intents. Show a confirmation card before any execution.',
      'Use live protocol data where available; if a tool result isFallback or isStale, clearly say it is fallback data.',
      'Risk score every recommendation from 1 to 10.',
    ].join(' ');

    await streamAnthropicCall(messages, systemPrompt, anthropicKey, res, address);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.write(JSON.stringify({ error: err.message }));
    res.end();
  }
}
