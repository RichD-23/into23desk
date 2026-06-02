/**
 * POST /api/messages/send
 *
 * Agent sends a message (or adds an internal note) to a conversation.
 * For real outbound (not notes), also calls WhatsApp Cloud API to deliver
 * the message to the customer. Returns the WA message ID so we can track
 * delivery status via the inbound webhook.
 *
 * Body: { conversationId: string, content: string, isNote?: boolean, agentName?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversationId, content, isNote, agentName } = body || {};

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the conversation + contact to get the phone number
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select(`
      id, language, status, assigned_agent_id, workspace_id,
      contacts(phone, name, language)
    `)
    .eq('id', conversationId)
    .single();

  if (convErr || !conv) {
    return NextResponse.json(
      { error: 'Conversation not found', details: convErr?.message },
      { status: 404 }
    );
  }

  // Notes don't go to WhatsApp
  const messageType: 'text' | 'note' = isNote ? 'note' : 'text';
  const direction: 'out' | 'note' = isNote ? 'note' : 'out';

  // For real outbound, also send via WhatsApp Cloud API
  let waMessageId: string | null = null;
  let waDelivery: 'sent' | 'delivered' | 'read' | 'failed' | null = null;
  let waError: string | undefined = undefined;
  let waSimulated: boolean = false;

  if (!isNote) {
    const contact = (conv as any).contacts;
    if (contact?.phone) {
      const result = await sendWhatsAppMessage({
        workspaceId: (conv as any).workspace_id,
        to: contact.phone,
        text: content.trim(),
      });
      if (result.ok) {
        waMessageId = result.messageId || null;
        waDelivery = 'sent';
      } else {
        waDelivery = 'failed';
        waError = result.error;
        waSimulated = result.simulated || false;
        // Don't fail the request — the message is still saved in the DB.
        // The agent can see the delivery status.
      }
    }
  }

  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .insert({
      workspace_id: (conv as any).workspace_id,
      conversation_id: conversationId,
      message_type: messageType,
      direction,
      content: content.trim(),
      delivery: isNote ? null : (waDelivery || 'sent'),
      author_name: agentName || 'Agent',
      wa_message_id: waMessageId,
    })
    .select()
    .single();

  if (msgErr) {
    console.error('[send] insert message failed:', msgErr);
    return NextResponse.json(
      { error: 'Failed to send message', details: msgErr.message },
      { status: 500 }
    );
  }

  // Update conversation metadata
  const updatePayload: any = {
    last_message: content.trim().slice(0, 200),
    last_message_time: new Date().toISOString(),
  };
  if (!isNote) {
    updatePayload.unread_count = 0;
  }

  const { error: updateErr } = await supabase
    .from('conversations')
    .update(updatePayload)
    .eq('id', conversationId);

  if (updateErr) {
    console.error('[send] update conversation failed:', updateErr);
  }

  return NextResponse.json({
    message,
    conversation_id: conversationId,
    whatsapp: waMessageId
      ? { ok: true, messageId: waMessageId, delivery: waDelivery }
      : waDelivery === 'failed'
      ? { ok: false, error: waError, simulated: waSimulated }
      : null,
  });
}
