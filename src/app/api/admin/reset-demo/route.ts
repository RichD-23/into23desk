/**
 * POST /api/admin/reset-demo
 *
 * Wipes all messages (including seed) so the inbox is clean for the next demo.
 * Conversations remain so the list/contacts are intact, but message threads
 * will be empty until new messages come in.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(_request: NextRequest) {
  const supabase = createAdminClient();

  // Delete all messages.
  const { count: deletedMessages, error: delMsgErr } = await supabase
    .from('messages')
    .delete({ count: 'exact' })
    .gte('created_at', '1970-01-01');

  if (delMsgErr) {
    return NextResponse.json({ error: 'Failed to delete messages', details: delMsgErr.message }, { status: 500 });
  }

  // Reset conversation metadata so they don't reference deleted messages.
  const { error: convErr } = await supabase
    .from('conversations')
    .update({
      last_message: null,
      unread_count: 0,
      last_message_time: new Date().toISOString(),
    })
    .gte('created_at', '1970-01-01');

  if (convErr) {
    return NextResponse.json({ error: 'Failed to reset conversations', details: convErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted_messages: deletedMessages ?? 0,
    conversations_reset: true,
  });
}
