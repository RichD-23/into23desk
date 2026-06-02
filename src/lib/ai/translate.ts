/**
 * Server-side AI translation helper for SwiftDesk.
 *
 * Architecture: model-agnostic. Supports multiple providers via env-var switch.
 *
 * Providers (in priority order, see SWIFTDESK_TRANSLATE_PROVIDER):
 *   - PERPLEXITY (default for the demo — works from HK, fast, cheap)
 *   - QWEN       (best multilingual SEA/India, mid cost)
 *   - DEEPSEEK   (cheapest, good for English)
 *   - MIMO       (Xiaomi MiMo — strategic partner integration for the Xiaomi bid)
 *   - OPEN_AI    (geo-blocked from HK, kept for portability)
 *   - ANTHROPIC  (OpenAI-compatible, needs anthropic/ prefix)
 *   - GEMINI     (OpenAI-compatible, needs google/ prefix)
 *
 * Each provider can also be overridden at call time via the `provider` arg to
 * translateText / detectLanguage.
 */
import { completion } from '@rocketnew/llm-sdk';

export const LANG_NAMES: Record<string, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
  th: 'Thai',
  vi: 'Vietnamese',
  ta: 'Tamil',
  hi: 'Hindi',
  bn: 'Bengali',
  ms: 'Malay',
  tl: 'Tagalog',
};

export const LANG_CODES = Object.keys(LANG_NAMES);

export type Provider = 'PERPLEXITY' | 'QWEN' | 'DEEPSEEK' | 'MIMO' | 'OPEN_AI' | 'ANTHROPIC' | 'GEMINI';

export const PROVIDER_LABELS: Record<Provider, string> = {
  PERPLEXITY: 'Perplexity Sonar (default)',
  QWEN:       'Alibaba Qwen (SEA quality)',
  DEEPSEEK:   'DeepSeek V3 (cheapest)',
  MIMO:       'Xiaomi MiMo (partner tier)',
  OPEN_AI:    'OpenAI gpt-4o-mini (geo-blocked in HK)',
  ANTHROPIC:  'Anthropic Claude 3.5 Sonnet',
  GEMINI:     'Google Gemini 1.5 Flash',
};

export const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
  PERPLEXITY: 'Fast, cheap, good for demos. $0.005/req.',
  QWEN:       'Best multilingual for ID/TH/VI/TA/HI. $0.50–1 / 1M tokens.',
  DEEPSEEK:   'Cheapest, strong for English. $0.14–0.28 / 1M tokens.',
  MIMO:       'Xiaomi MiMo — strategic partnership tier. (beta)',
  OPEN_AI:    'gpt-4o-mini. Geo-blocked from HK; not usable here.',
  ANTHROPIC:  'claude-3-5-sonnet. Strong reasoning, mid cost.',
  GEMINI:     'gemini-1.5-flash. Fast, mid cost.',
};

function getProvider(override?: Provider | string): Provider {
  if (override) {
    const valid = ['PERPLEXITY', 'QWEN', 'DEEPSEEK', 'MIMO', 'OPEN_AI', 'ANTHROPIC', 'GEMINI'];
    if (valid.includes(override)) return override as Provider;
  }
  const env = process.env.SWIFTDESK_TRANSLATE_PROVIDER as Provider | undefined;
  if (env && ['PERPLEXITY', 'QWEN', 'DEEPSEEK', 'MIMO', 'OPEN_AI', 'ANTHROPIC', 'GEMINI'].includes(env)) {
    return env;
  }
  return 'PERPLEXITY';
}

function getModel(provider: Provider): string {
  // 1. SWIFTDESK_TRANSLATE_MODEL overrides everything.
  if (process.env.SWIFTDESK_TRANSLATE_MODEL) {
    return process.env.SWIFTDESK_TRANSLATE_MODEL;
  }
  // 2. Provider-specific model from env.
  const providerModel = process.env[`SWIFTDESK_MODEL_${provider}`];
  if (providerModel) return providerModel;
  // 3. Default.
  switch (provider) {
    case 'OPEN_AI':
      return 'gpt-4o-mini';
    case 'ANTHROPIC':
      return 'anthropic/claude-3-5-sonnet-latest';
    case 'GEMINI':
      return 'google/gemini-1.5-flash';
    case 'PERPLEXITY':
      return 'perplexity/sonar';
    case 'QWEN':
      return 'qwen/qwen-plus';
    case 'DEEPSEEK':
      return 'deepseek/deepseek-chat';
    case 'MIMO':
      return process.env.XIAOMI_MIMO_MODEL || 'mimo-7b';
    default:
      return 'perplexity/sonar';
  }
}

function getApiKey(provider: Provider): string | undefined {
  switch (provider) {
    case 'OPEN_AI':
      return process.env.OPENAI_API_KEY;
    case 'ANTHROPIC':
      return process.env.ANTHROPIC_API_KEY;
    case 'GEMINI':
      return process.env.GEMINI_API_KEY;
    case 'PERPLEXITY':
      return process.env.PERPLEXITY_API_KEY;
    case 'QWEN':
      return process.env.QWEN_API_KEY;
    case 'DEEPSEEK':
      return process.env.DEEPSEEK_API_KEY;
    case 'MIMO':
      return process.env.XIAOMI_MIMO_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Call an OpenAI-compatible chat completions endpoint directly (bypass the SDK).
 * Used for providers the @rocketnew/llm-sdk doesn't natively support (e.g. Xiaomi MiMo,
 * custom endpoints). Expects the standard { choices: [{ message: { content } }] } response.
 */
async function callOpenAICompatible(opts: {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}): Promise<{ content: string }> {
  const res = await fetch(opts.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.max_tokens ?? 500,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(`HTTP ${res.status} from ${opts.endpoint}`);
    err.status = res.status;
    err.body = text.slice(0, 500);
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return { content };
}

/**
 * Call the LLM for a chat completion. Routes to the SDK for known providers,
 * direct OpenAI-compatible fetch for MIMO.
 */
async function chat(opts: {
  provider: Provider;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const provider = opts.provider;
  const model = getModel(provider);
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    throw new Error(`No API key for provider ${provider}`);
  }

  // Xiaomi MiMo: direct OpenAI-compatible call (SDK may not support it)
  if (provider === 'MIMO') {
    const endpoint = process.env.XIAOMI_MIMO_ENDPOINT || 'https://api.xiaomi.com/v1/chat/completions';
    const result = await callOpenAICompatible({
      endpoint,
      apiKey,
      model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
    });
    return result.content;
  }

  // Default: route through @rocketnew/llm-sdk
  const response: any = await completion({
    model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    stream: false,
    api_key: apiKey,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.max_tokens ?? 500,
  });

  return response?.choices?.[0]?.message?.content || '';
}

/**
 * Detect the language of a customer message.
 * Returns one of the codes in LANG_CODES, or 'en' as a safe default.
 */
export async function detectLanguage(text: string, providerOverride?: Provider | string): Promise<string> {
  if (!text || text.trim().length === 0) return 'en';

  const provider = getProvider(providerOverride);
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    console.warn(`[translate] No API key for provider ${provider}, defaulting to 'en'`);
    return 'en';
  }

  try {
    const content = await chat({
      provider,
      system: `You are a language identifier. Given a short customer support message, output ONLY the ISO 639-1 code from this list: ${LANG_CODES.join(', ')}. No explanation, no quotes.`,
      user: text,
      temperature: 0,
      max_tokens: 10,
    });
    const detected = content.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 2);
    if (LANG_CODES.includes(detected)) return detected;
    return 'en';
  } catch (err: any) {
    console.error(`[translate] detectLanguage failed via ${provider}:`, err?.message || err);
    return 'en';
  }
}

/**
 * Translate `text` to `targetLang` (a code in LANG_CODES).
 * If `sourceLang` is provided, the prompt mentions it; otherwise the model infers.
 *
 * Returns the translated text, or the original text on failure.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string,
  providerOverride?: Provider | string
): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  if (targetLang === 'en' && sourceLang === 'en') return text; // no-op

  const targetName = LANG_NAMES[targetLang] || 'English';
  const sourceName = sourceLang ? LANG_NAMES[sourceLang] || sourceLang : null;

  const provider = getProvider(providerOverride);
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    console.warn(`[translate] No API key for provider ${provider}, skipping translation`);
    return text;
  }

  try {
    const systemPrompt = sourceName
      ? `You are a professional translator. Translate the given text from ${sourceName} to ${targetName}. Return ONLY the translated text, no explanations, no quotes.`
      : `You are a professional translator. Detect the source language and translate the given text to ${targetName}. Return ONLY the translated text, no explanations, no quotes.`;

    const content = await chat({
      provider,
      system: systemPrompt,
      user: text,
      temperature: 0.2,
      max_tokens: Math.min(1000, text.length * 3),
    });

    const translated = (content || '').trim();
    return translated || text;
  } catch (err: any) {
    console.error(`[translate] translateText failed via ${provider}:`, err?.message || err);
    return text;
  }
}

/**
 * Check which providers are configured (have an API key).
 * Returns a map of provider → { configured, model, key_preview }.
 */
export function getProviderStatus(): Record<Provider, { configured: boolean; model: string; keyPreview?: string }> {
  const status: Record<string, any> = {};
  for (const p of ['PERPLEXITY', 'QWEN', 'DEEPSEEK', 'MIMO', 'OPEN_AI', 'ANTHROPIC', 'GEMINI'] as Provider[]) {
    const key = getApiKey(p);
    status[p] = {
      configured: !!key,
      model: getModel(p),
      keyPreview: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : undefined,
    };
  }
  return status as Record<Provider, any>;
}
