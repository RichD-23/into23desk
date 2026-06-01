/**
 * POST /api/conversations/resolve
 * Body: { conversationId: string }
 * Marks a conversation as resolved and bumps the resolved_at timestamp.
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
  const { conversationId } = body || {};
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('conversations')
    .update({ status: 'resolved', unread_count: 0 })
    .eq('id', conversationId);

  if (error) {
    return NextResponse.json({ error: 'Failed to resolve', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
