import { useState, useCallback } from 'react';
import { usePortalStore } from '../../../store/usePortalStore';

export function useAgentChat() {
  const { messages, addMessage, updateMessage, wallets } = usePortalStore();
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setIsStreaming(true);
      addMessage({ type: 'user', text });

      const agentMsgId = addMessage({ type: 'agent', text: '' });
      let responseText = '';

      try {
        const userAddress = wallets[0]?.address || 'your Mantle wallet';
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            address: userAddress,
            history: messages.map((m) => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.text) {
                    responseText += data.text;
                    updateMessage(agentMsgId, { text: responseText });
                  }
                } catch {
                  responseText += line.slice(6);
                  updateMessage(agentMsgId, { text: responseText });
                }
              }
            }
          }
        } else {
          // Fallback simulation
          const words = `I'm processing your request on Mantle. Let me check the ecosystem registries…`.split(' ');
          for (const word of words) {
            responseText += word + ' ';
            updateMessage(agentMsgId, { text: responseText });
            await new Promise((r) => setTimeout(r, 40));
          }
        }
      } catch (err) {
        console.error(err);
        updateMessage(agentMsgId, { text: 'Connection error to ecosystem agent.' });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, addMessage, updateMessage, wallets]
  );

  return {
    sendMessage,
    isStreaming,
  };
}
