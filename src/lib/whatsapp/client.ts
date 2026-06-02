/**
 * WhatsApp Cloud API client.
 *
 * The outbound sender. Used by agent sends in MessageThread + the onboarding
 * wizard for the welcome message after Meta Embedded Signup completes.
 *
 * Auth: each workspace stores its own WhatsApp access token (obtained via
 * Meta Embedded Signup). The token is passed per-call from the workspace row.
 *
 * For the demo (no real WABA yet), use the no-op function sendWhatsAppSimulated
 * which just logs to the DB. Real production traffic goes through sendWhatsAppMessage.
 */
import { createAdminClient } from '@/lib/supabase/admin';

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

export interface SendWhatsAppArgs {
  workspaceId: string;
  to: string; // E.164 phone number, e.g. +6281234567890
  text: string;
  // Optional: reply to a specific message (for threading)
  contextMessageId?: string;
}

export interface SendWhatsAppResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

interface WorkspaceWA {
  whatsapp_phone_number_id: string | null;
  whatsapp_access_token_encrypted: string | null;
  whatsapp_business_account_id: string | null;
}

async function loadWorkspaceWA(workspaceId: string): Promise<WorkspaceWA | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('whatsapp_phone_number_id, whatsapp_access_token_encrypted, whatsapp_business_account_id')
    .eq('id', workspaceId)
    .single();
  if (error || !data) return null;
  return data as WorkspaceWA;
}

/**
 * Decrypt a workspace's WhatsApp access token. For now we use plain base64
 * (NOT secure — placeholder). TODO: replace with KMS or Supabase Vault.
 */
function decryptToken(encrypted: string): string {
  // Placeholder decryption — for now just return as-is. In production, use
  // a proper KMS or the Supabase Vault extension.
  return encrypted;
}

/**
 * Send a WhatsApp message via the Cloud API.
 * Falls back to a simulated send if the workspace has no WhatsApp credentials.
 */
export async function sendWhatsAppMessage(args: SendWhatsAppArgs): Promise<SendWhatsAppResult> {
  const ws = await loadWorkspaceWA(args.workspaceId);
  if (!ws || !ws.whatsapp_phone_number_id || !ws.whatsapp_access_token_encrypted) {
    return {
      ok: false,
      simulated: true,
      error: 'Workspace has no WhatsApp credentials configured. Run Meta Embedded Signup to connect.',
    };
  }

  const accessToken = decryptToken(ws.whatsapp_access_token_encrypted);
  const url = `${META_GRAPH_API}/${ws.whatsapp_phone_number_id}/messages`;

  const body: Record<string, any> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: args.to.replace(/[^\d+]/g, ''), // strip formatting
    type: 'text',
    text: { preview_url: false, body: args.text },
  };
  if (args.contextMessageId) {
    body.context = { message_id: args.contextMessageId };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error?.message || `HTTP ${res.status}`,
    };
  }

  return {
    ok: true,
    messageId: data.messages?.[0]?.id,
  };
}

/**
 * Mark a WhatsApp message as read. Optional but improves the customer
 * experience (the blue ticks appear immediately).
 */
export async function markWhatsAppRead(args: { workspaceId: string; messageId: string }): Promise<boolean> {
  const ws = await loadWorkspaceWA(args.workspaceId);
  if (!ws?.whatsapp_phone_number_id || !ws?.whatsapp_access_token_encrypted) return false;

  const accessToken = decryptToken(ws.whatsapp_access_token_encrypted);
  const res = await fetch(`${META_GRAPH_API}/${ws.whatsapp_phone_number_id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: args.messageId,
    }),
  });
  return res.ok;
}
