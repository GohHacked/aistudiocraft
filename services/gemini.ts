import { Message } from "../types";

// --- SYSTEM PROMPT ---
// Defines the persona and coding standards.
const SYSTEM_PROMPT = `
You are an expert full-stack developer designated as "Claude 3.5 Sonnet (Turbo)".
Your goal is to build functional, high-quality web applications.

CRITICAL RULES:
1. **NO TRUNCATION**: You must write the FULL code. Do not write "// ... rest of code". Do not stop in the middle. Write every single line.
2. **Single File**: Generate a SINGLE index.html file containing ALL CSS (<style>) and JavaScript (<script>).
3. **Self-Correction**: Check for unclosed tags before finishing.
4. **Visuals**: Make the apps look modern, using gradients, glassmorphism, and smooth animations.
5. **Robustness**: If the prompt is vague, build a complete, working example.

Format your response exactly like this:
Here is the complete code:
\`\`\`html
<!DOCTYPE html>
...
\`\`\`
`;

// --- WORKER SCRIPT ---
// We create a blob worker to run the fetch in a background thread.
const WORKER_CODE = `
self.onmessage = async (e) => {
  const { prompt, history, systemPrompt } = e.data;

  // We optimize history to prevent context overflow, keeping system prompt and last few messages
  const recentHistory = history.slice(-6); 

  const messages = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map(msg => ({ 
      role: msg.role === 'model' ? 'assistant' : 'user', 
      content: msg.text 
    })),
    { role: "user", content: prompt }
  ];

  try {
    const response = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        stream: true,
        model: 'openai', // Using OpenAI for speed/reasoning, styled as Claude via prompt
        temperature: 0.7,
        presence_penalty: 0.0, // Encourage staying on topic
        max_tokens: 8000 // Attempt to force larger context output
      })
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines only
      let boundary = buffer.lastIndexOf('\\n');
      if (boundary === -1) continue; // Wait for more data

      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 1);

      const lines = chunk.split('\\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              self.postMessage({ type: 'chunk', text: content });
            }
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }
    self.postMessage({ type: 'done' });

  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
`;

// --- MAIN THREAD BRIDGE ---
export const streamResponse = async function* (
  modelId: string,
  prompt: string, 
  history: Message[]
) {
  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);

  let resolveStream: (() => void) | null = null;
  
  const queue: any[] = [];
  let waitingForChunk = false;

  const pushToQueue = (data: any) => {
    queue.push(data);
    if (waitingForChunk && resolveStream) {
      resolveStream();
      waitingForChunk = false;
    }
  };

  worker.onmessage = (e) => {
    pushToQueue(e.data);
  };

  worker.onerror = (e) => {
    pushToQueue({ type: 'error', error: e.message });
  };

  worker.postMessage({ prompt, history, systemPrompt: SYSTEM_PROMPT });

  try {
    while (true) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          resolveStream = resolve;
          waitingForChunk = true;
        });
      }

      const data = queue.shift();

      if (data.type === 'chunk') {
        yield data.text;
      } else if (data.type === 'done') {
        break;
      } else if (data.type === 'error') {
        throw new Error(data.error || "Worker error");
      }
    }
  } catch (err: any) {
    console.error("Stream Error:", err);
    yield `\n\n**System Error:** ${err.message || 'Connection interrupted'}. \nPlease try again.`;
  } finally {
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
  }
};