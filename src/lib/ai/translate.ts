/**
 * Server-side AI translation helper.
 * Used by API routes to fill the `translated` column on inbound messages
 * so agents can read non-English customer messages in English.
 *
 * Default provider: Perplexity sonar (works from HK, cheap, good enough for translation).
 * Override via env: SWIFTDESK_TRANSLATE_PROVIDER, SWIFTDESK_TRANSLATE_MODEL.
 *
 * NOTE: the @rocketnew/llm-sdk requires model names in the form `{provider}/{model}`,
 * e.g. `perplexity/sonar-pro`. The provider passed to /api/ai/chat-completion is the
 * SDK's provider key (PERPLEXITY, OPEN_AI, etc.), not the prefix in the model name.
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

type Provider = 'OPEN_AI' | 'ANTHROPIC' | 'GEMINI' | 'PERPLEXITY';

function getProvider(): Provider {
  const env = process.env.SWIFTDESK_TRANSLATE_PROVIDER as Provider | undefined;
  if (env && ['OPEN_AI', 'ANTHROPIC', 'GEMINI', 'PERPLEXITY'].includes(env)) {
    return env;
  }
  return 'PERPLEXITY';
}

function getModel(provider: Provider): string {
  if (process.env.SWIFTDESK_TRANSLATE_MODEL) {
    return process.env.SWIFTDESK_TRANSLATE_MODEL;
  }
  switch (provider) {
    case 'OPEN_AI':
      return 'gpt-4o-mini';
    case 'ANTHROPIC':
      return 'anthropic/claude-3-5-sonnet-latest';
    case 'GEMINI':
      return 'google/gemini-1.5-flash';
    case 'PERPLEXITY':
      return 'perplexity/sonar';
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
    default:
      return undefined;
  }
}

/**
 * Detect the language of a customer message.
 * Returns one of the codes in LANG_CODES, or 'en' as a safe default.
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return 'en';

  const provider = getProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    console.warn(`[translate] No API key for provider ${provider}, defaulting to 'en'`);
    return 'en';
  }

  try {
    const response: any = await completion({
      model: getModel(provider),
      messages: [
        {
          role: 'system',
          content: `You are a language identifier. Given a short customer support message, output ONLY the ISO 639-1 code from this list: ${LANG_CODES.join(', ')}. No explanation, no quotes.`,
        },
        { role: 'user', content: text },
      ],
      stream: false,
      api_key: apiKey,
      temperature: 0,
      max_tokens: 10,
    });

    const raw: string = response?.choices?.[0]?.message?.content || '';
    const detected = raw.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 2);
    if (LANG_CODES.includes(detected)) return detected;
    return 'en';
  } catch (err) {
    console.error('[translate] detectLanguage failed:', err);
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
  sourceLang?: string
): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  if (targetLang === 'en' && sourceLang === 'en') return text; // no-op

  const targetName = LANG_NAMES[targetLang] || 'English';
  const sourceName = sourceLang ? LANG_NAMES[sourceLang] || sourceLang : null;

  const provider = getProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    console.warn(`[translate] No API key for provider ${provider}, skipping translation`);
    return text;
  }

  try {
    const systemPrompt = sourceName
      ? `You are a professional translator. Translate the given text from ${sourceName} to ${targetName}. Return ONLY the translated text, no explanations, no quotes.`
      : `You are a professional translator. Detect the source language and translate the given text to ${targetName}. Return ONLY the translated text, no explanations, no quotes.`;

    const response: any = await completion({
      model: getModel(provider),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      stream: false,
      api_key: apiKey,
      temperature: 0.2,
      max_tokens: Math.min(1000, text.length * 3),
    });

    const translated: string = (response?.choices?.[0]?.message?.content || '').trim();
    return translated || text;
  } catch (err) {
    console.error('[translate] translateText failed:', err);
    return text;
  }
}

