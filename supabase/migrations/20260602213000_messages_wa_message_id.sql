-- ============================================================
-- Add wa_message_id column to messages table for proper
-- WhatsApp message tracking (status updates from the inbound webhook).
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS wa_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_wa_message_id
  ON public.messages(wa_message_id)
  WHERE wa_message_id IS NOT NULL;
