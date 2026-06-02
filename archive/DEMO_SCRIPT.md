# SwiftDesk — Demo Script for HM (June 10, 2026)

**Audience:** HM (majority shareholder, publicly listed in HK)
**Time:** 12–15 min, plus Q&A
**Goal:** Show that SwiftDesk is a real, working WhatsApp-native support desk — not a wireframe, not a slide.

## Setup (do this 5 min before)

- Open the app on the staging URL (Netlify preview — link in the deploy info)
- Sign in as `maya@batikcraft.id` / `Demo@Into23!`
- Pre-load the inbox with a fresh demo state (the reset button is in the Demo Simulator)
- Open the Demo Simulator panel (top-right of the inbox)
- Have the KB page open in another tab as backup
- Quiet your Slack / phone

## Narrative arc

> 1. **The pain** (1 min) — Freshdesk was built email-first. WhatsApp is the customer channel of choice across SEA + India. The wedge is wide open.
> 2. **The product** (8 min) — Live walkthrough of the WhatsApp-native inbox
> 3. **The moat** (3 min) — Multilingual AI, ground truth for the SEA/India SMB
> 4. **The ask** (2 min) — Keep it simple, mention pilot timeline

## The walkthrough (8 min)

### 1. Sign in (30 sec)
- Open the app, show the value-prop panel: "WhatsApp-native, not bolted on"
- Sign in with the seeded admin account

### 2. Inbox opens — pre-seeded (30 sec)
- 5 conversations, 5 languages: **ID, TH, VI, TA, HI**
- Point out the language badges on the left, the "AI" tag on conversations the AI thinks it can answer
- The first one is Siti Rahayu, Jakarta, asking about a late Shopee order

### 3. Open a conversation — translation magic (2 min)
- Click on **Siti Rahayu's** conversation
- Show the message thread — her last message is in Bahasa Indonesia
- **Point out the "→ I want to ask about my order that hasn't arrived" line** — the AI auto-translated to English
- **Click the AI Suggestion banner** (already open at top)
- Show the KB-grounded reply: "Your order SH-8821 is currently in transit at the JNE Bekasi sorting hub…"
- Click **"Use this reply"** — it lands in the composer
- Click **Send** — the message persists, the agent's reply is now in the thread

### 4. Fire a customer message live (1 min)
- Open the **Demo Simulator** panel (top-right)
- Pick **Siti Rahayu** from the contact dropdown
- Click the **"Polite asker"** preset (ID)
- Watch: the message lands in the inbox, the AI translates it, the AI suggestion appears
- This is the killer moment. **Don't skip the pause.**

### 5. Cycle through 4 more languages (2 min)
- **Thai (Somchai):** fire "Urgent" preset → see TH → EN translation
- **Vietnamese (Lan):** fire "Polite asker" preset → see VI → EN
- **Tamil (Meena):** fire "Chatter" preset → see TA → EN
- **Hindi (Rahul):** fire "Polite asker" preset → see HI → EN
- Point out: every message auto-translated, every conversation can be replied to in the customer's language

### 6. Send a real reply in Bahasa (1 min)
- Open the TH conversation, type "Pesanan Anda sedang dalam proses" in Indonesian (or English)
- Click **Translate** button on the composer
- Watch it translate to the customer's language
- Click **Send** — they get the message

### 7. Resolve (30 sec)
- Click **Resolve** on one of the conversations
- Watch the conversation move to "resolved" state

## The moat (3 min)

> *"Most CRMs force WhatsApp into a ticketing metaphor. We went the other way. The whole product is built around the chat."*

Quick points to hit:

- **Native language coverage** — 7 languages out of the box (ID, TH, VI, TA, HI, BN, EN). Most CRMs have 2-3.
- **AI translation** — incoming messages auto-translate to the agent's working language. Reply in any language, we translate back.
- **KB-grounded AI** — the suggestion engine reads your knowledge base and grounds replies in it. No hallucinated policies.
- **Demo simulator** (gesture to the panel) — the whole WhatsApp plumbing is mocked for this demo. In production this is the Meta Cloud API webhook, with full E2E encryption, delivery status, etc.
- **AI Deflection** (open the `/ai-deflection` page) — show the metrics. The KB articles that are most used, the deflection rate, the language coverage.

## The ask (2 min)

> *"We're 8 days from a public demo. The product is real, the demo is real. We need a green light to keep building and ship a real customer pilot in the next 60 days."*

Be specific:
- **Pilot timeline:** 2 SMBs in Jakarta + Manila by end of July
- **What's needed:** sign-off on hiring a junior engineer, budget for Meta Cloud API integration + WhatsApp Business verification
- **What's NOT needed:** more design, more strategy. The work is product.

## Q&A — common questions

**"Is this real WhatsApp or a mock?"**
> Right now, mocked via the simulator. Meta Cloud API integration is on the runway — 1 engineer-week. The WhatsApp Business verification process takes 1-2 weeks; we'd start that in parallel.

**"How does the AI know what to say?"**
> It reads your knowledge base. You write articles, the AI uses them. No training needed. If the KB has nothing relevant, the AI falls back to a polite "let me get an agent" reply.

**"What about privacy / PDPA?"**
> All data lives in Supabase (Singapore region). Conversation content is never used to train models. We're getting SOC 2 done in Q3.

**"Why not just use Twilio or 360dialog?"**
> We're not married to the integration layer. Cloud API direct is cheapest, 360dialog has the best dashboard, Twilio has the best dev experience. We can ship on any of them. The product differentiator is the UX + the AI, not the transport.

**"What's the pricing?"**
> $149/mo for the Pro tier (5 agents, unlimited conversations), $249/mo for up to 20 agents. Free 1,000 conversations/month on WhatsApp. We're pricing for SMBs, not enterprises.

## Backup slides (if asked)

- The full conversation timeline (analytics dashboard)
- The billing page (real subscription, invoice history)
- The KB editor
- The onboarding wizard

## What NOT to do

- Don't dwell on any single feature for more than 90 sec
- Don't show the "Sign Up / Log In" page (they've seen login screens before)
- Don't show source code or the file tree
- Don't apologize for anything being mocked — the simulator is a feature, not a workaround
- Don't promise specific dates unless you're 100% sure
- Don't mention vendor-db, Into23 Workspace, or the broader product strategy unless asked

## If something breaks

- **Inbox is empty:** Click the reset button in the Demo Simulator
- **AI doesn't translate:** the API key may have hit rate limit; reload, try again
- **Login fails:** use `priya@batikcraft.id` / `Agent@Into23!` instead
- **Network issues:** the demo is also reachable on the local dev URL `http://localhost:4028` as a fallback

## Rehearsal schedule

| Date | Activity |
|---|---|
| Jun 2 | Sprint plan, schema, foundation, simulator |
| Jun 3 | Wire all send/receive/translate flows |
| Jun 4 | Polish, deploy to staging |
| Jun 5–6 | Buffer for bugs |
| Jun 7 | Full dress rehearsal with Rich present |
| Jun 8 | Final fixes |
| Jun 9 | Quiet day, no changes |
| **Jun 10** | **Demo** |
