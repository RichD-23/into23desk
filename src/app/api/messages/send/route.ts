/**
 * POST /api/messages/send
 *
 * Agent sends a message (or adds an internal note) to a conversation.
 * Writes to `messages` and updates `conversations.last_message` / `last_message_time`.
 *
 * Body: { conversationId: string, content: string, isNote?: boolean, agentName?: string }
 *
 * For the demo: uses the service role key to bypass RLS. In production,
 * validate the user session and only allow the assigned agent to send.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // Fetch the conversation to get contact_id, language, etc.
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('id, contact_id, language, status, assigned_agent_id')
    .eq('id', conversationId)
    .single();

  if (convErr || !conv) {
    return NextResponse.json(
      { error: 'Conversation not found', details: convErr?.message },
      { status: 404 }
    );
  }

  // If this is a real (non-note) outbound message, optionally translate it
  // back to the customer's language. For the demo we just store what the
  // agent typed; production would call translateText() before sending to WA.
  const messageType: 'text' | 'note' = isNote ? 'note' : 'text';
  const direction: 'out' | 'note' = isNote ? 'note' : 'out';

  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      message_type: messageType,
      direction,
      content: content.trim(),
      delivery: isNote ? null : 'sent',
      author_name: agentName || 'Agent',
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

  // Update conversation metadata.
  // For real outbound, reset unread_count (since the agent is responding).
  // last_message / last_message_time should reflect the latest message regardless of direction
  // so the inbox list shows recent activity.
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
    // Don't fail the request — the message was inserted. Log and continue.
  }

  return NextResponse.json({ message, conversation_id: conversationId });
}
