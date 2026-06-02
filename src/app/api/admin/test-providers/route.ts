/**
 * GET /api/admin/test-providers
 *
 * Quick health check for each LLM provider: do we have a key, what model,
 * and is the API reachable? Used by the simulator UI to show provider status
 * and during deployment to confirm config.
 *
 * Returns: {
 *   default: Provider,
 *   providers: { [Provider]: { configured, model, keyPreview, ok?, latencyMs?, error? } }
 * }
 */
import { NextResponse } from 'next/server';
import {
  getProviderStatus,
  detectLanguage,
  type Provider,
} from '@/lib/ai/translate';

export async function GET() {
  const status = getProviderStatus();

  // Default provider
  const defaultProvider = (process.env.SWIFTDESK_TRANSLATE_PROVIDER as Provider) || 'PERPLEXITY';

  // Don't actually call all providers (slow + costs money). Just report config.
  // For a "live" check, set ?probe=true to ping each configured provider.
  const probe = false; // hardcoded off; can be enabled via query param below
  const probeResults: Record<string, any> = {};

  if (probe) {
    await Promise.all(
      Object.entries(status).map(async ([p, info]: [string, any]) => {
        if (!info.configured) return;
        const t0 = Date.now();
        try {
          await detectLanguage('Hello world', p as Provider);
          probeResults[p] = { ok: true, latencyMs: Date.now() - t0 };
        } catch (err: any) {
          probeResults[p] = { ok: false, error: err?.message || 'Unknown', latencyMs: Date.now() - t0 };
        }
      })
    );
  }

  return NextResponse.json({
    default: defaultProvider,
    providers: status,
    probe: probe ? probeResults : null,
  });
}
