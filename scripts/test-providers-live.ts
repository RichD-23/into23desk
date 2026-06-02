/**
 * Live health check for all 3 new LLM providers.
 * Tests translation + language detection via the real APIs.
 * Run with: npx tsx --env-file=.env scripts/test-providers-live.ts
 */
import {
  detectLanguage,
  translateText,
  getProviderStatus,
  type Provider,
} from '../src/lib/ai/translate';

const SAMPLES = [
  { text: 'สวัสดีครับ อยากสอบถามเรื่องการคืนสินค้าค่ะ', lang: 'th' },
  { text: 'Tôi cần hỗ trợ về đơn hàng #VN-9920', lang: 'vi' },
  { text: 'नमस्ते, मुझे अपना ऑर्डर कैंसिल करना है।', lang: 'hi' },
];

const PROVIDERS_TO_TEST: Provider[] = ['DEEPSEEK', 'QWEN', 'MIMO'];

async function testProvider(p: Provider): Promise<{ ok: boolean; latencyMs: number; error?: string; sample?: any }> {
  const t0 = Date.now();
  try {
    // 1. Detect language on a known sample
    const sample = SAMPLES[0];
    const detected = await detectLanguage(sample.text, p);
    const detectedOk = detected === sample.lang;

    // 2. Translate one sample
    const translated = await translateText(sample.text, 'en', sample.lang, p);

    return {
      ok: detectedOk && !!translated,
      latencyMs: Date.now() - t0,
      sample: { detected, expected: sample.lang, translated: translated.slice(0, 80) },
    };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err?.message || String(err),
    };
  }
}

async function main() {
  console.log('=== Provider status (config) ===');
  const status = getProviderStatus();
  for (const [p, info] of Object.entries(status)) {
    console.log(`  ${p.padEnd(12)} configured=${info.configured} model=${info.model} ${info.keyPreview ? `key=${info.keyPreview}` : ''}`);
  }

  console.log('\n=== Live health check (TH→EN translation) ===\n');

  for (const p of PROVIDERS_TO_TEST) {
    const s = status[p];
    if (!s.configured) {
      console.log(`  ${p}: SKIPPED (no key)`);
      continue;
    }
    process.stdout.write(`  ${p}: `);
    const result = await testProvider(p);
    if (result.ok) {
      console.log(`✓ ${result.latencyMs}ms — detected=${result.sample.detected}, translated="${result.sample.translated}…"`);
    } else {
      console.log(`✗ ${result.latencyMs}ms — error: ${result.error}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
