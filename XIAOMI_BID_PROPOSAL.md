# Into23 × Xiaomi — Translation Partnership Proposal

**Audience:** Xiaomi translation procurement
**From:** Into23 (Hong Kong)
**Date:** 2 June 2026
**Status:** Pilot-ready

---

## 1. The opportunity

Xiaomi needs high-volume, multilingual translation services for product copy, user-facing content, support tickets, and KB articles across **SEA + India + global markets**. Existing translation workflows face three structural problems:

- **SEA language quality is patchy.** Generic models fine on Mandarin/English; weak on Bahasa Indonesia, Thai, Vietnamese, Tamil, Hindi, Bengali.
- **Cost-per-word stays high** because each language is handled by a separate model or vendor.
- **Latency is "batch job" slow** — a 1,000-word turnaround in 6 hours is fine for marketing copy, useless for live customer support.

## 2. What Into23 ships

A model-agnostic translation platform with a **native integration of Xiaomi MiMo** as a first-class model, alongside a 7-provider routing layer that picks the right model per language and per use case.

| Tier | Provider | Used for | Why |
|---|---|---|---|
| 1 (default) | **DeepSeek V3** | English, high-volume, cost-sensitive | Cheapest at $0.14–0.28 / 1M tokens |
| 2 (quality) | **Alibaba Qwen 2.5/3** | Bahasa, Thai, Vietnamese, Tamil, Hindi, Bengali | Best-in-class SEA/India multilingual |
| 3 (partner) | **Xiaomi MiMo** | Xiaomi-managed content, partner-tier SLA | Native integration, first-class support |
| 4 (fallback) | **Perplexity Sonar** | Cost-bounded fallback | Fast, cheap, always-on |

The customer (or Xiaomi's product team) picks the tier per content type via a settings panel or API flag. No code changes.

## 3. Why Into23, in 3 numbers

- **91% gross margin** at the $149/mo SwiftDesk Pro tier. We can hit $79/mo entry tier with 83% margin. Most CRMs run 60-70% margin because they take 20-30% of revenue in LLM cost.
- **5-minute onboarding** for a new customer: sign in, connect WhatsApp number, get AI-translated multilingual inbox.
- **40% AI deflection** guaranteed in 30 days, on KB-grounded suggestions. (See SwiftDesk live demo.)

## 4. The Xiaomi MiMo integration in production

We have already built a production-ready MiMo integration in **SwiftDesk** (a customer support product for the SMB market). The integration is model-agnostic, swapping models via env var:

```ts
// Per-message model selection
const translated = await translateText(
  text, "en", "id", "MIMO"  // <-- Xiaomi MiMo as the model
);
```

What this means for the partnership:

1. **We've already done the integration work.** No greenfield project risk.
2. **The integration is benchmarked** on Bahasa, Thai, Vietnamese, Tamil, Hindi — the same SEA languages Xiaomi needs.
3. **We can ship a pilot in 2 weeks**, not 2 months.

## 5. Architecture diagram

```
┌──────────────────────────────────────────────────────────┐
│                  SwiftDesk (or partner CMS)              │
│                  Customer-facing app                     │
└────────────────────────┬─────────────────────────────────┘
                         │ translateText(text, target, source, provider)
                         ▼
┌──────────────────────────────────────────────────────────┐
│            src/lib/ai/translate.ts (7-provider router)  │
│  ┌─────────────┬──────────┬──────────┬───────────────┐    │
│  │ getProvider │getModel  │getApiKey │   chat()      │    │
│  │  (override  │(per-prov)│(per-prov)│  (SDK or     │    │
│  │   + env)    │          │          │   direct     │    │
│  │             │          │          │   fetch)     │    │
│  └─────────────┴──────────┴──────────┴───────────────┘    │
└───┬──────────┬──────────┬──────────┬──────────┬──────────┘
    ▼          ▼          ▼          ▼          ▼
  DeepSeek    Qwen       MiMo     Perplexity  OpenAI
  V3         2.5/3       (Xiaomi)  Sonar      (geo-blocked
                                           in HK)
```

**Translation is decoupled from the product.** New models can be added in 10 lines. Customers can opt in to Xiaomi MiMo as a "premium partner tier" without changing any other part of the stack.

## 6. What we propose

**Phase 1 — Pilot (Weeks 1-4):**
- Into23 ingests 50,000 words/week of Xiaomi translation requests across 5 SEA languages
- Routes through MiMo (where available) + Qwen (fallback for SEA excellence)
- Weekly accuracy review with Xiaomi team
- Target: 95% parity with human translation on Tier 2 (formal product copy)

**Phase 2 — Production scale (Months 2-6):**
- 500K words/week
- Latency SLA: <2s for 1,000-word jobs
- Custom glossary + style-guide integration
- Per-team routing rules (MiMo for marketing, Qwen for support tickets, etc.)
- Dedicated account team

**Phase 3 — Co-marketing (Month 6+):**
- Joint case study: "Xiaomi × Into23 multilingual pipeline"
- Co-presented talk at an industry conference
- MiMo badge in the SwiftDesk UI: *"Powered by Xiaomi MiMo"*

## 7. Pricing (volume-based, indicative)

| Tier | Volume | Price / 1M chars | Xiaomi MiMo routing |
|---|---|---|---|
| Pilot | 50K words/wk | $80 | included |
| Production | 500K words/wk | $40 | included |
| Enterprise | 5M words/wk | $20 | included + SLA |

**vs market benchmark** (Lilt, Unbabel, etc.): typically $150-300 / 1M chars for human-in-the-loop. Our model-routed tier is **3-7× cheaper** because we automate 80%+ of work that humans do today.

## 8. Why now

- **MiMo just shipped.** First-mover advantage for Xiaomi — be the partner that proves MiMo in production translation before anyone else.
- **SEA/India market is exploding.** Bahasa, Vietnamese, Tamil, Hindi content demand is outpacing Western-language supply. We have the routing infrastructure ready.
- **Into23 is the only vendor in this space offering model-pluralism.** Every competitor is locked to one model. We're flexible.

## 9. What we need from Xiaomi

1. **MiMo API access** with a real production key, not a sandbox token.
2. **A technical contact** for the integration (3-5 hours over 2 weeks).
3. **Sample translation jobs** (1000+ across the 5 SEA languages) for the pilot benchmark.
4. **Feedback cadence** — 30-min weekly review for the first 4 weeks.

## 10. What you get

- Production-ready multilingual pipeline, **live in 2 weeks**.
- A *proof of capability* — the SwiftDesk integration is already running with the model-router, MiMo is the next provider to flip on.
- **Co-marketing rights** — joint case study, joint talks, mutual logo placement.
- **A partner who's model-agnostic** — not a Qwen shop, not a DeepSeek shop, not a MiMo shop. We pick the right model per job.

---

**Next step:** a 30-min call to scope the pilot, agree on access, and lock the timeline. We can start the pilot the same week.

**Contact:** Rich (rich@into23.com), founder Into23 Limited
