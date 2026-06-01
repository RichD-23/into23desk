# SwiftDesk

**Native WhatsApp support desk for SMBs in Southeast Asia and India.** FreshDesk-competitive, WhatsApp-first.

> Alpha build for the June 10, 2026 board demo to HM (majority shareholder, publicly listed in HK).

## Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS with a custom design system (Plus Jakarta Sans, JetBrains Mono)
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **AI:** Perplexity Sonar via `@rocketnew/llm-sdk` (OpenAI / Anthropic / Gemini also supported)
- **Deploy:** Netlify (via `@netlify/plugin-nextjs`)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up env (see .env.example or just copy the contents of .env)
cp .env .env.local

# 3. Apply database schema (one-time, requires DATABASE_URL)
npm run migrate

# 4. Start dev server
npm run dev
# → http://localhost:4028
```

## Demo accounts (seeded by the migration)

| Role | Email | Password |
|---|---|---|
| SMB Admin | `maya@batikcraft.id` | `Demo@Into23!` |
| Support Agent | `priya@batikcraft.id` | `Agent@Into23!` |
| Team Lead | `raj@cloudstack.in` | `Lead@Into23!` |
| Agent | `arif@batikcraft.id` | `Agent@Into23!` |
| Agent | `kavitha@batikcraft.id` | `Agent@Into23!` |

The seed also includes 5 multilingual contacts (Indonesian, Thai, Vietnamese, Tamil, Hindi), 5 open conversations in those languages, 6 KB articles, and a `Pro` plan subscription.

## Demo flow (June 10, 2026)

The "Demo Simulator" button in the top-right of the inbox is the **invisible stagehand** that lets the presenter inject customer WhatsApp messages on cue. In production, this is replaced by the real WhatsApp Cloud API webhook.

1. Sign in as `maya@batikcraft.id` / `Demo@Into23!`
2. Open the Team Inbox — pre-seeded with 5 conversations in 5 languages
3. Click **Demo Simulator** in the top-right
4. Pick a contact (Siti, Somchai, Nguyen, Meena, Rahul)
5. Click any of the one-tap presets, or type a custom message in any language
6. Watch it land in the inbox, AI-translated to English
7. Click an open conversation → use the **AI Suggestion** banner (KB-grounded reply)
8. Hit **Send** → message persists, Realtime updates for the whole team
9. Hit **Resolve** → conversation moves to resolved state

## Key routes

| Route | What |
|---|---|
| `/` | Team Inbox (Real Supabase data, Realtime updates) |
| `/contacts` | Customer list (real data) |
| `/ai-deflection` | KB performance metrics (real data) |
| `/knowledge-base-management` | KB editor |
| `/analytics-dashboard` | Conversation volume / FRT / deflection charts |
| `/billing-dashboard` | Plan + invoices |
| `/account-settings-configuration` | Workspace settings |
| `/onboarding-setup-wizard` | 5-step setup (mocked, demo only) |
| `/sign-up-login` | Auth |
| `/api/messages/send` | Agent send (writes to `messages` table) |
| `/api/messages/simulate-inbound` | Demo simulator (inserts customer message, AI-translates) |
| `/api/conversations/resolve` | Mark conversation as resolved |
| `/api/ai/chat-completion` | Generic LLM proxy |
| `/api/ai/kb-suggest` | KB-grounded reply suggestions |

## Architecture notes

- **Service role key:** If `SUPABASE_SERVICE_ROLE_KEY` is set, server-side routes use it (bypasses RLS). If not, they fall back to the anon key — the seed migration has permissive RLS for authenticated users, so this works for the demo. Tighten before production.
- **AI provider:** Default is Perplexity Sonar because OpenAI is geo-blocked from Hong Kong. Override with `SWIFTDESK_TRANSLATE_PROVIDER` and `SWIFTDESK_TRANSLATE_MODEL` env vars.
- **Realtime:** `InboxLayout` subscribes to `postgres_changes` on `conversations` and `messages` — agent sends, customer simulator, and resolution all trigger automatic refresh.
- **Translations:** `translated` column on `messages` is auto-filled by the AI when an inbound message arrives in a non-English language.

## What's NOT in the alpha (post-demo roadmap)

- Real WhatsApp Cloud API webhook (currently simulated)
- Multi-tenant isolation
- Mobile app
- Stripe billing
- CRM / e-commerce platform integrations
- Outbound campaigns
- CSAT surveys / SLA management
