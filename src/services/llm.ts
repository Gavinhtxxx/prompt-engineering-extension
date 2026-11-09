import type { ModelConfig } from '../types';
import { SKILLS, GENERAL_SKILL_ID, buildGeneratorSystemPrompt, buildRouterPrompt } from '../skills';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GenOptions {
  maxTokens: number;
  temperature: number;
  responseLanguage?: 'auto' | 'zh' | 'en';
  maxLength?: number;
}

export interface TestResult {
  ok: boolean;
  error?: string;
}

function endpoint(model: ModelConfig): string {
  if (!model.baseUrl) {
    throw new Error(`模型 ${model.name} 未配置 Base URL`);
  }
  return `${model.baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

async function completeNonStreaming(
  model: ModelConfig,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const response = await fetch(endpoint(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0,
      stream: false,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export const llmService = {
  /**
   * 两段式路由第一段：为最新一条用户消息选择 skill。
   * 返回 skill id（'keep'/非法值/任何错误都回退为 currentSkillId ?? general），绝不抛出。
   */
  async routeSkill(
    userText: string,
    currentSkillId: string | null,
    model: ModelConfig,
  ): Promise<string> {
    const fallback = currentSkillId ?? GENERAL_SKILL_ID;
    if (!model.apiKey || !model.baseUrl) return fallback;
    try {
      const raw = await completeNonStreaming(
        model,
        [
          { role: 'system', content: buildRouterPrompt(currentSkillId) },
          { role: 'user', content: userText.slice(0, 500) },
        ],
        16,
      );
      const token = raw.trim().toLowerCase().split(/[\s,.;:，。；]+/)[0];
      if (token === 'keep') return fallback;
      if (SKILLS.some((s) => s.id === token)) return token;
      return fallback;
    } catch {
      return fallback;
    }
  },

  async chat(
    messages: ChatMessage[],
    skillId: string,
    model: ModelConfig,
    options: GenOptions,
    onChunk?: (text: string) => void,
  ): Promise<string> {
    if (!model.apiKey) {
      throw new Error(`模型 ${model.name} 未配置 API Key`);
    }

    const lang = options.responseLanguage ?? 'auto';
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: buildGeneratorSystemPrompt(skillId, lang) },
      ...messages,
    ];

    const response = await fetch(endpoint(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.model,
        messages: fullMessages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${err.slice(0, 200)}`);
    }

    if (onChunk && response.body) {
      return readStream(response.body, onChunk);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? '';
    if (options.maxLength && content.length > options.maxLength) {
      content = content.slice(0, options.maxLength) + '\n\n[…已截断至最大长度]';
    }
    return content;
  },

  async testConnection(model: ModelConfig): Promise<TestResult> {
    try {
      await this.chat(
        [{ role: 'user', content: 'Hi' }],
        GENERAL_SKILL_ID,
        model,
        { maxTokens: 5, temperature: 0 },
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : '未知错误' };
    }
  },
};

async function readStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onChunk(delta);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return fullText;
}
