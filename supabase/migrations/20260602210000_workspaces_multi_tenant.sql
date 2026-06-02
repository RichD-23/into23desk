-- ============================================================
-- SwiftDesk — Multi-Tenant Workspaces
-- Adds workspaces + workspace_members, scopes all data to workspace,
-- tightens RLS so users only see their own workspace's data.
--
-- Backfills existing data into a "Default Workspace" so the seed
-- keeps working. After this migration, every customer signup
-- creates a new workspace via /api/workspaces.
-- ============================================================

-- ── 1. NEW TABLES ────────────────────────────────────────────────────────────

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  -- WhatsApp Cloud API credentials (populated by Meta Embedded Signup)
  whatsapp_business_account_id TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_phone_number TEXT,
  whatsapp_access_token_encrypted TEXT,
  -- Plan + billing
  plan_id public.plan_id DEFAULT 'starter'::public.plan_id,
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '17 days'),
  is_active BOOLEAN DEFAULT true,
  -- Misc
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);

CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role public.user_role DEFAULT 'agent'::public.user_role,
  invited_by UUID REFERENCES public.user_profiles(id),
  invited_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);

-- ── 2. ADD workspace_id TO EXISTING TABLES ───────────────────────────────────

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.kb_articles ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.billing_subscriptions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON public.conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace ON public.messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_workspace ON public.kb_articles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_workspace ON public.billing_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_workspace ON public.billing_invoices(workspace_id);

-- ── 3. BACKFILL EXISTING DATA INTO A DEFAULT WORKSPACE ────────────────────────

INSERT INTO public.workspaces (id, name, slug, owner_id, plan_id, trial_ends_at, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Workspace',
  'demo',
  (SELECT id FROM public.user_profiles WHERE email = 'maya@batikcraft.id' LIMIT 1),
  'pro'::public.plan_id,
  '2026-12-31 23:59:59+00',
  true
) ON CONFLICT (id) DO NOTHING;

UPDATE public.contacts SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.conversations SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.messages SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.kb_articles SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.billing_subscriptions SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.billing_invoices SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- Now make workspace_id NOT NULL
ALTER TABLE public.contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.messages ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.kb_articles ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.billing_subscriptions ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.billing_invoices ALTER COLUMN workspace_id SET NOT NULL;

-- ── 4. ADD ALL DEMO USERS TO THE DEFAULT WORKSPACE ────────────────────────────

INSERT INTO public.workspace_members (workspace_id, user_id, role, accepted_at, is_active)
SELECT
  '00000000-0000-0000-0000-000000000001',
  up.id,
  up.role,
  now(),
  true
FROM public.user_profiles up
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ── 5. ENABLE RLS ON NEW TABLES ───────────────────────────────────────────────

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ── 6. DROP OLD PERMISSIVE POLICIES ───────────────────────────────────────────

DROP POLICY IF EXISTS "authenticated_manage_contacts" ON public.contacts;
DROP POLICY IF EXISTS "authenticated_manage_conversations" ON public.conversations;
DROP POLICY IF EXISTS "authenticated_manage_messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated_manage_kb_articles" ON public.kb_articles;
DROP POLICY IF EXISTS "users_manage_own_billing_subscriptions" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "users_manage_own_billing_invoices" ON public.billing_invoices;
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_all_profiles" ON public.user_profiles;

-- ── 7. NEW WORKSPACE-SCOPED POLICIES ──────────────────────────────────────────

-- user_profiles: a user can see all profiles in workspaces they belong to
DROP POLICY IF EXISTS "workspace_members_see_profiles" ON public.user_profiles;
CREATE POLICY "workspace_members_see_profiles" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR id IN (
      SELECT wm.user_id FROM public.workspace_members wm
      WHERE wm.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND is_active = true
      ) AND wm.is_active = true
    )
  );

DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- workspaces: a user can see workspaces they belong to
DROP POLICY IF EXISTS "members_see_workspaces" ON public.workspaces;
CREATE POLICY "members_see_workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- workspaces: only owner can update
DROP POLICY IF EXISTS "owner_manages_workspace" ON public.workspaces;
CREATE POLICY "owner_manages_workspace" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- workspaces: any authenticated user can create one
DROP POLICY IF EXISTS "authenticated_create_workspace" ON public.workspaces;
CREATE POLICY "authenticated_create_workspace" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- workspace_members: members can see the roster
DROP POLICY IF EXISTS "members_see_roster" ON public.workspace_members;
CREATE POLICY "members_see_roster" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- workspace_members: workspace owners can add/remove members
DROP POLICY IF EXISTS "owner_manages_members" ON public.workspace_members;
CREATE POLICY "owner_manages_members" ON public.workspace_members
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- workspace_members: a user can self-add (accept an invite)
DROP POLICY IF EXISTS "self_accept_invite" ON public.workspace_members;
CREATE POLICY "self_accept_invite" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Generic helper: workspace-scoped SELECT/ALL on data tables
-- (contacts, conversations, messages, kb_articles, billing_*)
-- A user can read/write rows in workspaces they belong to.

-- Contacts
DROP POLICY IF EXISTS "workspace_scoped_contacts" ON public.contacts;
CREATE POLICY "workspace_scoped_contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Conversations
DROP POLICY IF EXISTS "workspace_scoped_conversations" ON public.conversations;
CREATE POLICY "workspace_scoped_conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Messages
DROP POLICY IF EXISTS "workspace_scoped_messages" ON public.messages;
CREATE POLICY "workspace_scoped_messages" ON public.messages
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- KB articles
DROP POLICY IF EXISTS "workspace_scoped_kb_articles" ON public.kb_articles;
CREATE POLICY "workspace_scoped_kb_articles" ON public.kb_articles
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Billing subscriptions
DROP POLICY IF EXISTS "workspace_scoped_billing_subscriptions" ON public.billing_subscriptions;
CREATE POLICY "workspace_scoped_billing_subscriptions" ON public.billing_subscriptions
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Billing invoices
DROP POLICY IF EXISTS "workspace_scoped_billing_invoices" ON public.billing_invoices;
CREATE POLICY "workspace_scoped_billing_invoices" ON public.billing_invoices
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ── 8. UPDATED_AT TRIGGERS ──────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 9. DONE ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE 'Multi-tenant migration applied.';
  RAISE NOTICE 'Workspaces: %', (SELECT count(*) FROM public.workspaces);
  RAISE NOTICE 'Workspace members: %', (SELECT count(*) FROM public.workspace_members);
  RAISE NOTICE 'Contacts in workspaces: %', (SELECT count(*) FROM public.contacts WHERE workspace_id IS NOT NULL);
  RAISE NOTICE 'Conversations in workspaces: %', (SELECT count(*) FROM public.conversations WHERE workspace_id IS NOT NULL);
  RAISE NOTICE 'Messages in workspaces: %', (SELECT count(*) FROM public.messages WHERE workspace_id IS NOT NULL);
  RAISE NOTICE 'KB articles in workspaces: %', (SELECT count(*) FROM public.kb_articles WHERE workspace_id IS NOT NULL);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration completed with warnings: %', SQLERRM;
END $$;
