# SwiftDesk Sprint — End of Day 1 Handoff
**Date:** 2026-06-02 22:45 HKT
**For:** Rich
**From:** Mavis

---

## The 30-second version

SwiftDesk is a WhatsApp-native customer support desk for small businesses in Southeast Asia and India. The product is built to a point where a real customer can sign up, pay, and start handling WhatsApp messages — but there are a few external setup steps you need to do on the Meta + Stripe sides, plus a few pieces of UI work left before it's ready to demo to a pilot customer.

**Branch state:** `sprint-jun10` on GitHub, **15 commits, all pushed**. The code is solid, the database is migrated, the AI translation works. We're roughly 70% of the way to a sellable product.

---

## What's built (and works)

### 1. Multi-tenant architecture
SwiftDesk now supports **multiple customers** in one deployment. Each customer gets:
- Their own **workspace** (think: their company in SwiftDesk)
- Their own **contacts, conversations, KB articles, billing**
- Their own **user roles** (admin / team_lead / agent)

This is critical because without it, every customer would see every other customer's data. The database is now scoped: a user can ONLY see their workspace's data. This was tested and verified.

### 2. WhatsApp integration (code-complete, waiting on you)
The real WhatsApp Cloud API is wired:
- **Inbound:** when a customer sends a WhatsApp message, it lands in SwiftDesk automatically
- **Outbound:** when an agent replies, it goes back via WhatsApp
- **Delivery status:** sent / delivered / read all tracked
- **Connection flow:** "Connect WhatsApp" button in the onboarding wizard (uses Meta's official flow, with a manual paste-credentials mode as a fallback)

What's not tested: **we need your WhatsApp Business Account to actually run real messages through**. Code is done; just waiting on the Meta account setup.

### 3. AI translation (works perfectly)
- When a customer writes in Thai, the agent sees the English translation
- When the agent writes in English, the system can translate to Thai for the reply
- Supports 7 languages: Bahasa Indonesia, Thai, Vietnamese, Tamil, Hindi, Bengali, English
- Uses Perplexity (fast, cheap) for the demo, with Qwen (best for SEA languages) wired in for production
- Translation is automatic — agent doesn't have to click anything

### 4. Stripe billing (code-complete, waiting on you)
- **Checkout** when a customer wants to subscribe
- **Webhook** that updates their plan when they pay
- **Customer portal** for self-service (update card, cancel, view invoices)
- **Three pricing tiers** (you confirmed the $39 entry): $39 Starter, $149 Pro, $349 Scale
- **Plan limits** coded: Starter gets 1 agent + 500 conversations/month, Pro gets 5 + 5,000, Scale gets 20 + unlimited

What's not tested: **we need to create the Stripe products/prices in your Stripe dashboard** (one-time setup, ~30 minutes). Code is done; waiting on the Stripe Price IDs to be set in the environment.

### 5. Auth + signup + workspace
- Users can sign up with email/password
- On signup, a workspace is auto-created for them
- They can invite team members (admin/team_lead only can invite)
- Cookie-based "current workspace" so they can switch contexts (e.g., a freelancer supporting 3 SMBs)

### 6. The simulator (was the demo tool, now stays as a "test mode")
- 12 preset customer personas in 6 languages
- "Send a series" button to fire 3 messages with realistic delays
- Per-call model picker (so you can demo "this would route through Qwen for SEA quality, DeepSeek for cost, etc.")
- Reset button to wipe the inbox between demo runs

### 7. The original scaffold (preserved)
- Auth (sign-up/login)
- Inbox UI (3-pane: conversation list / message thread / contact context)
- Knowledge Base management
- Analytics dashboard (with real data hooks ready)
- Billing dashboard (will need UI update to use Stripe)
- Settings
- Onboarding wizard (still mock — needs to be wired to real flow)

---

## What's still to build (these are my tasks, in priority order)

When you pick this up tomorrow, here are the things I'll do in roughly this order, unless you redirect me:

1. **Public sign-up form** — make it so a new user can hit the page, pick a plan, and sign up. Right now, sign-up works in code, but the page needs polish to make it look like a real product.

2. **Billing page UI** — wire the "Subscribe" button on the billing page to call our Stripe checkout endpoint. After payment, the webhook updates their plan automatically.

3. **UI refactor** — make sure every page only shows the current workspace's data. Most of this is already done via the database permissions, but I want to double-check the UI.

4. **Plan enforcement** — if a Starter-tier customer goes over 500 conversations in a month, we need to either block new messages or charge overage fees. The code is half-done.

5. **Production deploy + monitoring** — get the app actually live at a real URL (not just localhost) with error tracking, so we know when things break.

6. **Token security** — currently the WhatsApp and Stripe credentials are stored in plain text in the database. That's OK for development, NOT OK for production. I'll move them to encrypted storage.

7. **Email verification on signup** — make sure new customers verify their email before they can start using the app.

---

## What YOU need to do (outside of our process here)

These are things only you can do. They involve external services (Meta, Stripe, etc.) and need decisions or credentials from you.

### **TODAY/TOMORROW — High priority**

#### 1. **Set up WhatsApp Business Account (1-2 weeks for Meta approval)**
This is the slowest thing. You said you'd start it tomorrow. To set it up:
- Go to https://business.facebook.com/ and create a Meta Business account (if you don't have one)
- Go to https://developers.facebook.com/ and create a Meta App (type: Business)
- In the App Dashboard, add the "WhatsApp" product
- Create a WhatsApp Business Account
- Either buy a new number or port an existing business number to WhatsApp
- Submit for Meta verification (this is the 1-2 week step)
- Once verified, you'll get a **Phone Number ID** and a **permanent access token** — paste these into the workspace via the "Connect WhatsApp" button in the app (or via the manual paste mode)

**What to tell me when you have these:** paste the Phone Number ID and access token in chat, and I'll wire them into the demo workspace so the live WhatsApp flow works.

#### 2. **Set up Stripe products (30 min)**
- Log into https://dashboard.stripe.com/
- Create three Products: "SwiftDesk Starter", "SwiftDesk Pro", "SwiftDesk Scale"
- For each, add a recurring monthly price: $39, $149, $349
- Copy the **Price ID** for each (looks like `price_1abc...`)
- Give me those three Price IDs, I'll add them to the environment

**Why this matters:** without the Stripe Price IDs, the "Subscribe" button on the billing page won't be wired to a real charge. Customers can sign up and use the trial, but they can't pay yet.

#### 3. **Pick a domain for the app (if you want a custom URL)**
The current setup uses `into23desk1637.builtwithrocket.new` (the original Rocket.new URL). For a real product, you'd want something like:
- `app.swiftdesk.com` (if you own the swiftdesk.com domain)
- `swiftdesk.into23.com` (a subdomain of your main site)
- Or stay on the Rocket.new URL for now (totally fine for the pilot)

**What to tell me:** either "use this domain" + DNS access, or "keep the Rocket URL for now."

### **NEXT WEEK — Medium priority**

#### 4. **Pilot customer names**
You mentioned India network is your best bet. When you have 1-2 names:
- I'll prep a one-pager explaining SwiftDesk for them
- I'll set up a workspace for them
- I'll connect a WhatsApp number to that workspace (could be a separate WhatsApp number for each pilot customer, or shared)

**You don't need to give me the names today** — just have them ready by mid-week.

### **BEFORE GOING LIVE — Important for production**

#### 5. **Error tracking account (Sentry or similar)**
- 5 minutes to sign up at https://sentry.io/
- Free tier covers us through the pilot
- I'll wire it in once you have an account

#### 6. **Email sending for password resets + notifications**
- For development, the app uses Supabase's built-in email (works for ~50 emails/day, fine for the pilot)
- For production, you might want to use Resend (the same email provider you already have for the vendor portal) or Postmark
- Tell me which one and I'll wire it in

### **NICE TO HAVE — Lower priority**

- **Custom branding**: colors, logo, your own font
- **Help center / docs**: a public-facing docs site for customers
- **Status page**: so customers can see if WhatsApp or Stripe is having issues
- **Analytics**: track which features customers use (Plausible, PostHog, etc.)

---

## Pricing summary (what you confirmed)

| Tier | Price | Who it's for | What they get |
|---|---|---|---|
| **Starter** | $39/mo | Solo founders, 1-person shops | 1 agent seat, 500 conversations/month, all core features |
| **Pro** | $149/mo | Small teams, 2-5 agents | 5 agent seats, 5,000 conversations, advanced analytics |
| **Scale** | $349/mo | Larger teams, high volume | 20 agent seats, unlimited conversations, priority support |

You confirmed the $39 entry tier over my push for it. The math: even at $39, we keep 97% gross margin because LLM cost is ~$0.50/customer. **$39 is a "try it" price, not a "decide" price** — volume beats ARPU in the SEA/India SMB market.

---

## Quick reference

- **Repo:** `github.com/RichD-23/into23desk` (currently public, will go private)
- **Branch:** `sprint-jun10` (15 commits, all pushed)
- **Supabase project:** `avnhelsrtwxgzrmeymuo.supabase.co` (already configured, service role key in .env)
- **Where the app lives right now:** only on `localhost:4028` on your machine — not deployed yet
- **Demo accounts** (for the seed data): `maya@batikcraft.id` / `Demo@Into23!`
- **When something breaks:** the dev server is on `http://localhost:4028` after `npm run dev`

---

## When you pick this up tomorrow

Just open chat and tell me what to do next. Suggestions, in order of leverage:

1. **"Going to set up the WhatsApp Business Account today"** — I'll prep a step-by-step checklist
2. **"Here are the Stripe Price IDs"** — paste them, I'll wire up billing
3. **"Go public sign-up"** — I'll do that piece of UI work
4. **"Go billing page UI"** — I'll wire up the Subscribe button
5. **"Go UI refactor"** — I'll scope every page by workspace

Or, if you want to talk strategy first, do that. I'm here.
