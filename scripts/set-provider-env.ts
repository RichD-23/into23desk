/**
 * Set the 3 LLM provider keys in .env (idempotent — overwrites if present, appends if not).
 * Keys are passed in as env vars, never echoed.
 */
import { readFileSync, writeFileSync } from 'fs';

const path = '.env';
let env = readFileSync(path, 'utf-8');

const updates: Record<string, string> = {
  DEEPSEEK_API_KEY:        process.env.DEEPSEEK_API_KEY || '',
  QWEN_API_KEY:            process.env.QWEN_API_KEY || '',
  XIAOMI_MIMO_API_KEY:     process.env.XIAOMI_MIMO_API_KEY || '',
  QWEN_BASE_URL:           'https://dashscope.aliyuncs.com/compatible-mode/v1',
  DEEPSEEK_BASE_URL:       'https://api.deepseek.com/v1',
  XIAOMI_MIMO_ENDPOINT:    process.env.XIAOMI_MIMO_ENDPOINT || 'https://api.xiaomi.com/v1/chat/completions',
  XIAOMI_MIMO_MODEL:       process.env.XIAOMI_MIMO_MODEL || 'mimo-7b',
};

for (const [key, value] of Object.entries(updates)) {
  if (!value) continue;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(env)) {
    env = env.replace(re, `${key}=${value}`);
    console.log(`  updated ${key}`);
  } else {
    env += `\n${key}=${value}\n`;
    console.log(`  added ${key}`);
  }
}

writeFileSync(path, env);
console.log('[env] done');
