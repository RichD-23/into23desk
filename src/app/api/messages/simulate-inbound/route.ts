/**
 * POST /api/messages/simulate-inbound
 *
 * The "invisible stagehand" for the demo. Injects a customer (inbound) message
 * into the inbox, with optional automatic language detection + AI translation
 * to English so the agent can read it.
 *
 * In production this would be replaced by the real WhatsApp Cloud API webhook.
 * For the June 10 demo to HM, this lets us show 5 languages flowing in on cue.
 *
 * Body: {
 *   contactId?: string,        // one of contactId or conversationId is required
 *   conversationId?: string,
 *   content: string,
 *   language?: string,         // ISO 639-1 code; if omitted, AI detects
 *   provider?: string,         // LLM provider override (PERPLEXITY/QWEN/DEEPSEEK/MIMO/...)
 *   withTypingDelay?: number,  // ms before insertion (simulates the customer typing)
 *   withAiTranslation?: boolean, // default true — translate to English
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { detectLanguage, translateText, LANG_NAMES, getProviderStatus, type Provider } from '@/lib/ai/translate';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    contactId,
    conversationId,
    content,
    language,
    provider,
    withTypingDelay = 0,
    withAiTranslation = true,
  } = body || {};

  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }
  if (!contactId && !conversationId) {
    return NextResponse.json(
      { error: 'Either contactId or conversationId is required' },
      { status: 400 }
    );
  }

  if (withTypingDelay > 0) {
    await new Promise((r) => setTimeout(r, Math.min(withTypingDelay, 5000)));
  }

  const supabase = createAdminClient();

  // Resolve contact_id + conversation.
  let resolvedContactId = contactId;
  let resolvedConvId = conversationId;
  let contactLanguage: string | null = null;
  let contactName: string | null = null;

  if (!resolvedConvId) {
    // Find the most recent open conversation for this contact, or create one.
    const { data: existing, error: findErr } = await supabase
      .from('conversations')
      .select('id, language, contact_id, contacts(language, name)')
      .eq('contact_id', contactId)
      .neq('status', 'resolved')
      .order('last_message_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr) {
      console.error('[simulate] find conversation failed:', findErr);
      return NextResponse.json(
        { error: 'Failed to find conversation', details: findErr.message },
        { status: 500 }
      );
    }

    if (existing) {
      resolvedConvId = existing.id;
      contactLanguage =
        (existing.contacts as any)?.language || (existing as any).language || 'en';
      contactName = (existing.contacts as any)?.name || 'Customer';
    } else {
      // Get the contact for language.
      const { data: c, error: cErr } = await supabase
        .from('contacts')
        .select('id, language, name')
        .eq('id', contactId)
        .single();
      if (cErr || !c) {
        return NextResponse.json(
          { error: 'Contact not found', details: cErr?.message },
          { status: 404 }
        );
      }
      contactLanguage = c.language;
      contactName = c.name;
      resolvedContactId = c.id;

      // Create a new conversation.
      const { data: newConv, error: createErr } = await supabase
        .from('conversations')
        .insert({
          contact_id: c.id,
          status: 'open',
          language: c.language,
          last_message: content.trim().slice(0, 200),
          last_message_time: new Date().toISOString(),
          unread_count: 1,
        })
        .select()
        .single();

      if (createErr || !newConv) {
        return NextResponse.json(
          { error: 'Failed to create conversation', details: createErr?.message },
          { status: 500 }
        );
      }
      resolvedConvId = newConv.id;
    }
  } else {
    // conversationId provided — fetch its contact.
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, contact_id, language, contacts(language, name)')
      .eq('id', conversationId)
      .single();
    if (convErr || !conv) {
      return NextResponse.json(
        { error: 'Conversation not found', details: convErr?.message },
        { status: 404 }
      );
    }
    resolvedContactId = (conv as any).contact_id;
    contactLanguage =
      (conv.contacts as any)?.language || (conv as any).language || 'en';
    contactName = (conv.contacts as any)?.name || 'Customer';
  }

  // Determine language: explicit > contact default > AI-detect.
  let detectedLang = (language || contactLanguage || 'en').toLowerCase();
  if (!language) {
    try {
      const aiLang = await detectLanguage(content, provider);
      if (aiLang) detectedLang = aiLang;
    } catch (err) {
      console.warn('[simulate] language detect failed, using contact default');
    }
  }

  // AI translate to English so the agent can read it.
  let translated: string | null = null;
  let usedProvider: Provider | null = null;
  if (withAiTranslation && detectedLang !== 'en') {
    try {
      translated = await translateText(content, 'en', detectedLang, provider);
      usedProvider = (provider as Provider) || (process.env.SWIFTDESK_TRANSLATE_PROVIDER as Provider) || 'PERPLEXITY';
    } catch (err) {
      console.warn('[simulate] translation failed');
    }
  }

  // Insert the inbound message.
  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: resolvedConvId,
      message_type: 'text',
      direction: 'in',
      content: content.trim(),
      delivery: 'read',
      translated,
      author_name: contactName,
    })
    .select()
    .single();

  if (msgErr || !message) {
    console.error('[simulate] insert message failed:', msgErr);
    return NextResponse.json(
      { error: 'Failed to insert message', details: msgErr?.message },
      { status: 500 }
    );
  }

  // Update conversation: bump unread, refresh last_message.
  const { data: currentConv } = await supabase
    .from('conversations')
    .select('unread_count, waiting_time')
    .eq('id', resolvedConvId)
    .single();

  await supabase
    .from('conversations')
    .update({
      last_message: content.trim().slice(0, 200),
      last_message_time: new Date().toISOString(),
      unread_count: (currentConv?.unread_count || 0) + 1,
      language: detectedLang,
      ai_suggestion: true,
    })
    .eq('id', resolvedConvId);

  return NextResponse.json({
    message,
    conversation_id: resolvedConvId,
    contact_id: resolvedContactId,
    detected_language: detectedLang,
    detected_language_name: LANG_NAMES[detectedLang] || detectedLang,
    translated,
    provider_used: usedProvider,
  });
}
