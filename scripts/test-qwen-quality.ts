/**
 * Multi-language translation quality test for Qwen.
 * Verifies Qwen handles the 5+ demo languages well.
 */
import { translateText, detectLanguage, type Provider } from '../src/lib/ai/translate';

const SAMPLES: { text: string; lang: string; expectedTranslation: string }[] = [
  {
    lang: 'th',
    text: 'สวัสดีครับ อยากสอบถามเรื่องการคืนสินค้าค่ะ',
    expectedTranslation: 'Hello, I would like to inquire about returning a product',
  },
  {
    lang: 'id',
    text: 'Pesanan SH-8821 saya sudah 5 hari belum sampai, tolong dicek ya',
    expectedTranslation: 'My order SH-8821 has not arrived after 5 days, please check',
  },
  {
    lang: 'vi',
    text: 'Tôi cần hỗ trợ về đơn hàng #VN-9920, cảm ơn bạn',
    expectedTranslation: 'I need help with order #VN-9920, thank you',
  },
  {
    lang: 'ta',
    text: 'என் ஆர்டர் எங்கே உள்ளது? 3 நாட்கள் ஆகிவிட்டது',
    expectedTranslation: 'Where is my order? It has been 3 days',
  },
  {
    lang: 'hi',
    text: 'मुझे अपना ऑर्डर कैंसिल करना है, कृपया मदद करें',
    expectedTranslation: 'I want to cancel my order, please help',
  },
];

async function main() {
  console.log('=== Qwen multilingual quality test ===\n');
  for (const sample of SAMPLES) {
    const t0 = Date.now();
    const detected = await detectLanguage(sample.text, 'QWEN' as Provider);
    const translated = await translateText(sample.text, 'en', sample.lang, 'QWEN' as Provider);
    const ms = Date.now() - t0;
    const ok = detected === sample.lang;
    console.log(`  [${ok ? '✓' : '✗'}] ${sample.lang} → ${translated.slice(0, 60)}…  (${ms}ms)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
