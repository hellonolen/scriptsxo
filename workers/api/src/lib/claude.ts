export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
  messages: ClaudeMessage[];
}

export interface ClaudeResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export async function callClaude(
  env: { ANTHROPIC_API_KEY: string },
  options: ClaudeOptions
): Promise<ClaudeResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? 'claude-haiku-4-5-20251001',
      max_tokens: options.maxTokens ?? 1024,
      system: options.system,
      messages: options.messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as {
    content?: Array<{ text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  return {
    content: data.content?.[0]?.text ?? '',
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}
