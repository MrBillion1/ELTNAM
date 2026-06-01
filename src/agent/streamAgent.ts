import Anthropic from '@anthropic-ai/sdk';
import { AGENT_SYSTEM_PROMPT } from './agentSystemPrompt';
import { AGENT_TOOLS } from './agentTools';

export async function* streamAgentResponse(message: string, address: string, history: any[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    yield { text: "Error: ANTHROPIC_API_KEY is not configured on the portal server." };
    return;
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const formattedHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: h.content,
    }));

    const stream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Standard Claude Sonnet model
      max_tokens: 1024,
      system: `${AGENT_SYSTEM_PROMPT}\n\nUser active wallet address: ${address}`,
      messages: [...formattedHistory, { role: 'user', content: message }],
      tools: AGENT_TOOLS as any,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield { text: chunk.delta.text };
      } else if (chunk.type === 'message_delta' && (chunk as any).delta?.stop_reason === 'tool_use') {
        // Handle tool calls in streaming
      }
    }
  } catch (err: any) {
    yield { text: `Error processing AI agent stream: ${err.message}` };
  }
}
