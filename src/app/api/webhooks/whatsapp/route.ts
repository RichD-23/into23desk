/**
 * WhatsApp Cloud API — INBOUND webhook.
 *
 * POST /api/webhooks/whatsapp
 *
 * Meta calls this URL whenever something happens on the business's WhatsApp
 * number: inbound messages, message status updates (sent/delivered/read),
 * etc. We verify the signature, then process the relevant events.
 *
 * Signature verification: Meta signs every webhook with X-Hub-Signature-256.
 * The signature is sha256=<HMAC_SHA256(APP_SECRET, raw_body)>.
 *
 * Two layers of verification:
 *  1. HMAC over the raw request body (catches tampering)
 *  2. The workspace's phone_number_id is in the payload (proves the
 *     webhook is for a number we own)
 *
 * Response: 200 OK as fast as possible. Meta retries on 5xx, so we
 * do all the heavy work asynchronously if needed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { translateText, detectLanguage, LANG_NAMES } from '@/lib/ai/translate';

const META_APP_SECRET = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;

function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;
  // Format: "sha256=<hex>"
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  // Constant-time compare
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(parts[1], 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contacts' | 'interactive';
          image?: { id: string; mime_type: string; sha256: string; caption?: string };
          document?: { id: string; mime_type: string; sha256: string; filename: string; caption?: string };
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: any[];
        }>;
      };
      field: string;
    }>;
  }>;
}

async function findWorkspaceByPhoneId(phoneNumberId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('whatsapp_phone_number_id', phoneNumberId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    console.error('[whatsapp-webhook] find workspace failed:', error.message);
    return null;
  }
  return data?.id || null;
}

async function processInboundMessage(args: {
  workspaceId: string;
  contactPhone: string;
  contactName: string;
  waMessageId: string;
  content: string;
  timestamp: Date;
}) {
  const supabase = createAdminClient();

  // 1. Find or create the contact
  let contactId: string;
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id, name, language')
    .eq('workspace_id', args.workspaceId)
    .eq('phone', args.contactPhone)
    .maybeSingle();

  if (existingContact) {
    contactId = existingContact.id;
    // Update name if we got a better one from WhatsApp
    if (args.contactName && (!existingContact.name || existingContact.name === args.contactPhone)) {
      await supabase.from('contacts').update({ name: args.contactName }).eq('id', contactId);
    }
  } else {
    const { data: newContact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        workspace_id: args.workspaceId,
        name: args.contactName || args.contactPhone,
        phone: args.contactPhone,
        language: 'en', // Will be auto-detected from the message
        platform: 'WhatsApp',
        total_conversations: 1,
        avg_csat: 0,
        tags: [],
      })
      .select('id')
      .single();
    if (contactErr || !newContact) {
      console.error('[whatsapp-webhook] create contact failed:', contactErr?.message);
      return;
    }
    contactId = newContact.id;
  }

  // 2. Find or create an open conversation
  let conversationId: string;
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id, unread_count')
    .eq('workspace_id', args.workspaceId)
    .eq('contact_id', contactId)
    .neq('status', 'resolved')
    .order('last_message_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        workspace_id: args.workspaceId,
        contact_id: contactId,
        status: 'open',
        last_message: args.content.slice(0, 200),
        last_message_time: args.timestamp.toISOString(),
        unread_count: 1,
        language: 'en',
        ai_suggestion: true,
      })
      .select('id')
      .single();
    if (convErr || !newConv) {
      console.error('[whatsapp-webhook] create conversation failed:', convErr?.message);
      return;
    }
    conversationId = newConv.id;
  }

  // 3. Insert the inbound message
  const { error: msgErr } = await supabase
    .from('messages')
    .insert({
      workspace_id: args.workspaceId,
      conversation_id: conversationId,
      message_type: 'text',
      direction: 'in',
      content: args.content,
      delivery: 'read',
      translated: null,
      author_name: args.contactName || args.contactPhone,
    });
  if (msgErr) {
    console.error('[whatsapp-webhook] insert message failed:', msgErr.message);
    return;
  }

  // 4. Bump conversation metadata
  await supabase
    .from('conversations')
    .update({
      last_message: args.content.slice(0, 200),
      last_message_time: args.timestamp.toISOString(),
      unread_count: (existingConv?.unread_count || 0) + 1,
      ai_suggestion: true,
    })
    .eq('id', conversationId);

  // 5. AI translate (non-blocking, fire-and-forget)
  translateInBackground(args.workspaceId, conversationId, args.content).catch((err) =>
    console.error('[whatsapp-webhook] translate failed:', err)
  );
}

async function translateInBackground(workspaceId: string, conversationId: string, text: string) {
  const supabase = createAdminClient();

  // Detect language
  let detectedLang: string;
  try {
    detectedLang = await detectLanguage(text);
  } catch {
    detectedLang = 'en';
  }

  // Translate to English for the agent (if non-English)
  let translated: string | null = null;
  if (detectedLang !== 'en') {
    try {
      translated = await translateText(text, 'en', detectedLang);
    } catch {
      translated = null;
    }
  }

  // Update the conversation's language
  await supabase
    .from('conversations')
    .update({ language: detectedLang })
    .eq('id', conversationId);

  // Update the most recent inbound message with the translation
  // (find the message we just inserted by conversation + content)
  await supabase
    .from('messages')
    .update({ translated })
    .eq('conversation_id', conversationId)
    .eq('direction', 'in')
    .eq('content', text)
    .order('created_at', { ascending: false })
    .limit(1);
}

async function processStatusUpdate(args: {
  workspaceId: string;
  waMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  errorMessage?: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('messages')
    .update({ delivery: args.status })
    .eq('content', '') // we don't have the wa_message_id column yet
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString())
    .limit(1);
  // This is a best-effort update; the proper fix is to add a wa_message_id
  // column to messages and update by that. TODO: schema change.
  if (error) console.error('[whatsapp-webhook] status update failed:', error.message);
}

export async function POST(request: NextRequest) {
  // Read the raw body for signature verification
  const rawBody = await request.text();

  // ── 1. Signature verification (skip in dev if no META_APP_SECRET) ────────
  if (META_APP_SECRET) {
    const sig = request.headers.get('x-hub-signature-256');
    if (!verifySignature(rawBody, sig, META_APP_SECRET)) {
      console.warn('[whatsapp-webhook] bad signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[whatsapp-webhook] META_APP_SECRET not set — skipping signature verification (DEV ONLY)');
  }

  // ── 2. Parse the payload ─────────────────────────────────────────────────
  let payload: WebhookPayload;
  try { payload = JSON.parse(rawBody); }
  catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ error: 'Not a WhatsApp event' }, { status: 400 });
  }

  // ── 3. Process each entry ────────────────────────────────────────────────
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const workspaceId = await findWorkspaceByPhoneId(phoneNumberId);
      if (!workspaceId) {
        console.warn(`[whatsapp-webhook] no workspace found for phone_number_id=${phoneNumberId}`);
        continue;
      }

      // ── Inbound messages ─────────────────────────────────────────────
      if (value.messages && value.contacts) {
        for (const msg of value.messages) {
          if (msg.type !== 'text' || !msg.text) continue;
          const contact = value.contacts.find((c) => c.wa_id === msg.from);
          await processInboundMessage({
            workspaceId,
            contactPhone: msg.from,
            contactName: contact?.profile?.name || msg.from,
            waMessageId: msg.id,
            content: msg.text.body,
            timestamp: new Date(parseInt(msg.timestamp, 10) * 1000),
          });
        }
      }

      // ── Status updates (sent/delivered/read) ──────────────────────────
      if (value.statuses) {
        for (const status of value.statuses) {
          await processStatusUpdate({
            workspaceId,
            waMessageId: status.id,
            status: status.status,
            timestamp: new Date(parseInt(status.timestamp, 10) * 1000),
            errorMessage: status.errors?.[0]?.message,
          });
        }
      }
    }
  }

  // ── 4. Acknowledge fast (Meta retries on 5xx) ──────────────────────────
  return NextResponse.json({ received: true });
}

// Handle GET (Meta sends a verification challenge when you first subscribe the webhook URL)
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token');
  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'swiftdesk-verify';
  if (verifyToken === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}
