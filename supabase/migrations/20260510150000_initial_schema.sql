-- ============================================================
-- SwiftDesk — Initial Schema Migration
-- Tables: user_profiles, contacts, conversations, messages,
--         kb_articles, team_members, billing_subscriptions, billing_invoices
-- ============================================================

-- ── 1. ENUM TYPES ─────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'agent', 'team_lead');

DROP TYPE IF EXISTS public.conversation_status CASCADE;
CREATE TYPE public.conversation_status AS ENUM ('open', 'assigned', 'pending', 'resolved');

DROP TYPE IF EXISTS public.message_direction CASCADE;
CREATE TYPE public.message_direction AS ENUM ('in', 'out', 'note');

DROP TYPE IF EXISTS public.message_type CASCADE;
CREATE TYPE public.message_type AS ENUM ('text', 'image', 'document', 'location', 'note');

DROP TYPE IF EXISTS public.delivery_status CASCADE;
CREATE TYPE public.delivery_status AS ENUM ('sent', 'delivered', 'read');

DROP TYPE IF EXISTS public.article_status CASCADE;
CREATE TYPE public.article_status AS ENUM ('published', 'draft', 'archived');

DROP TYPE IF EXISTS public.plan_id CASCADE;
CREATE TYPE public.plan_id AS ENUM ('starter', 'pro', 'enterprise');

DROP TYPE IF EXISTS public.billing_cycle CASCADE;
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'annual');

DROP TYPE IF EXISTS public.invoice_status CASCADE;
CREATE TYPE public.invoice_status AS ENUM ('paid', 'pending', 'failed');

DROP TYPE IF EXISTS public.agent_status CASCADE;
CREATE TYPE public.agent_status AS ENUM ('online', 'away', 'offline');

-- ── 2. DROP EXISTING TABLES (clean slate after CASCADE type drops) ─────────────

DROP TABLE IF EXISTS public.billing_invoices CASCADE;
DROP TABLE IF EXISTS public.billing_subscriptions CASCADE;
DROP TABLE IF EXISTS public.kb_articles CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ── 3. CORE TABLES ────────────────────────────────────────────────────────────

-- user_profiles (intermediary for auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role public.user_role DEFAULT 'agent'::public.user_role,
  agent_status public.agent_status DEFAULT 'offline'::public.agent_status,
  initials TEXT,
  color_class TEXT DEFAULT 'bg-blue-100 text-blue-700',
  languages TEXT[] DEFAULT ARRAY['EN']::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- contacts (customers)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  language TEXT DEFAULT 'en',
  location TEXT,
  platform TEXT,
  total_conversations INTEGER DEFAULT 0,
  avg_csat NUMERIC(3,1) DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  status public.conversation_status DEFAULT 'open'::public.conversation_status,
  assigned_agent_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  unread_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  ai_suggestion BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  waiting_time TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_type public.message_type DEFAULT 'text'::public.message_type,
  direction public.message_direction DEFAULT 'in'::public.message_direction,
  content TEXT NOT NULL,
  delivery public.delivery_status,
  media_url TEXT,
  file_name TEXT,
  file_size TEXT,
  author_name TEXT,
  translated TEXT,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- kb_articles
CREATE TABLE public.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status public.article_status DEFAULT 'draft'::public.article_status,
  languages TEXT[] DEFAULT ARRAY['en']::TEXT[],
  ai_usage_count INTEGER DEFAULT 0,
  deflection_score INTEGER DEFAULT 0,
  author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  content TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- billing_subscriptions
CREATE TABLE public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  plan_id public.plan_id DEFAULT 'starter'::public.plan_id,
  billing_cycle public.billing_cycle DEFAULT 'monthly'::public.billing_cycle,
  seats_used INTEGER DEFAULT 1,
  seats_total INTEGER DEFAULT 3,
  next_billing_date DATE,
  current_period_start DATE,
  current_period_end DATE,
  monthly_spend NUMERIC(10,2) DEFAULT 49,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- billing_invoices
CREATE TABLE public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.billing_subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  invoice_date DATE NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  status public.invoice_status DEFAULT 'pending'::public.invoice_status,
  invoice_url TEXT DEFAULT '#',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent ON public.conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON public.kb_articles(status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON public.kb_articles(category);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_id ON public.billing_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_user_id ON public.billing_invoices(user_id);

-- ── 5. FUNCTIONS ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- ── 6. ENABLE RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- ── 7. RLS POLICIES ───────────────────────────────────────────────────────────

-- user_profiles: own row only
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_read_all_profiles" ON public.user_profiles;
CREATE POLICY "users_read_all_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (true);

-- contacts: authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_manage_contacts" ON public.contacts;
CREATE POLICY "authenticated_manage_contacts"
ON public.contacts FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- conversations: authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_manage_conversations" ON public.conversations;
CREATE POLICY "authenticated_manage_conversations"
ON public.conversations FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- messages: authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_manage_messages" ON public.messages;
CREATE POLICY "authenticated_manage_messages"
ON public.messages FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- kb_articles: authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_manage_kb_articles" ON public.kb_articles;
CREATE POLICY "authenticated_manage_kb_articles"
ON public.kb_articles FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- billing_subscriptions: own records only
DROP POLICY IF EXISTS "users_manage_own_billing_subscriptions" ON public.billing_subscriptions;
CREATE POLICY "users_manage_own_billing_subscriptions"
ON public.billing_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- billing_invoices: own records only
DROP POLICY IF EXISTS "users_manage_own_billing_invoices" ON public.billing_invoices;
CREATE POLICY "users_manage_own_billing_invoices"
ON public.billing_invoices FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 8. TRIGGERS ───────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_kb_articles_updated_at ON public.kb_articles;
CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 9. MOCK DATA ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  admin_uuid UUID := gen_random_uuid();
  agent1_uuid UUID := gen_random_uuid();
  agent2_uuid UUID := gen_random_uuid();
  agent3_uuid UUID := gen_random_uuid();
  agent4_uuid UUID := gen_random_uuid();
  contact1_uuid UUID := gen_random_uuid();
  contact2_uuid UUID := gen_random_uuid();
  contact3_uuid UUID := gen_random_uuid();
  contact4_uuid UUID := gen_random_uuid();
  contact5_uuid UUID := gen_random_uuid();
  conv1_uuid UUID := gen_random_uuid();
  conv2_uuid UUID := gen_random_uuid();
  conv3_uuid UUID := gen_random_uuid();
  conv4_uuid UUID := gen_random_uuid();
  conv5_uuid UUID := gen_random_uuid();
  sub_uuid UUID := gen_random_uuid();
BEGIN
  -- Auth users (trigger creates user_profiles automatically)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'maya@batikcraft.id', crypt('Demo@Into23!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Maya Wijaya', 'role', 'admin'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (agent1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'priya@batikcraft.id', crypt('Agent@Into23!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Priya Nair', 'role', 'agent'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (agent2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'raj@cloudstack.in', crypt('Lead@Into23!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Raj Sharma', 'role', 'team_lead'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (agent3_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'arif@batikcraft.id', crypt('Agent@Into23!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Arif Wibowo', 'role', 'agent'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (agent4_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'kavitha@batikcraft.id', crypt('Agent@Into23!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Kavitha Rajan', 'role', 'agent'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- Update user_profiles with extra fields after trigger creates them
  UPDATE public.user_profiles SET
    initials = 'MW', color_class = 'bg-purple-100 text-purple-700',
    agent_status = 'online'::public.agent_status, languages = ARRAY['ID', 'EN']::TEXT[]
  WHERE id = admin_uuid;

  UPDATE public.user_profiles SET
    initials = 'PN', color_class = 'bg-purple-100 text-purple-700',
    agent_status = 'online'::public.agent_status, languages = ARRAY['EN', 'TA', 'HI']::TEXT[]
  WHERE id = agent1_uuid;

  UPDATE public.user_profiles SET
    initials = 'RS', color_class = 'bg-blue-100 text-blue-700',
    agent_status = 'online'::public.agent_status, languages = ARRAY['EN', 'HI']::TEXT[]
  WHERE id = agent2_uuid;

  UPDATE public.user_profiles SET
    initials = 'AW', color_class = 'bg-blue-100 text-blue-700',
    agent_status = 'online'::public.agent_status, languages = ARRAY['ID', 'EN']::TEXT[]
  WHERE id = agent3_uuid;

  UPDATE public.user_profiles SET
    initials = 'KR', color_class = 'bg-orange-100 text-orange-700',
    agent_status = 'online'::public.agent_status, languages = ARRAY['TA', 'EN', 'HI']::TEXT[]
  WHERE id = agent4_uuid;

  -- Contacts
  INSERT INTO public.contacts (id, name, phone, email, language, location, platform, total_conversations, avg_csat, tags)
  VALUES
    (contact1_uuid, 'Siti Rahayu', '+62 812-3456-7890', 'siti.rahayu@gmail.com', 'id', 'Jakarta, Indonesia', 'Shopee', 4, 4.2, ARRAY['repeat-buyer', 'vip']::TEXT[]),
    (contact2_uuid, 'Somchai Petcharat', '+66 81 234 5678', null, 'th', 'Bangkok, Thailand', 'Lazada', 2, 3.8, ARRAY['return-request']::TEXT[]),
    (contact3_uuid, 'Nguyen Thi Lan', '+84 90 123 4567', null, 'vi', 'Ho Chi Minh City, Vietnam', 'Shopify', 7, 4.7, ARRAY['vip', 'repeat-buyer']::TEXT[]),
    (contact4_uuid, 'Meena Krishnamurthy', '+91 98765 43210', null, 'ta', 'Chennai, India', 'Flipkart', 3, 4.0, ARRAY['escalated']::TEXT[]),
    (contact5_uuid, 'Rahul Verma', '+91 97654 32109', null, 'hi', 'Mumbai, India', 'Meesho', 1, 0, ARRAY['new-customer']::TEXT[])
  ON CONFLICT (id) DO NOTHING;

  -- Conversations
  INSERT INTO public.conversations (id, contact_id, status, assigned_agent_id, last_message, last_message_time, unread_count, language, ai_suggestion, priority, waiting_time)
  VALUES
    (conv1_uuid, contact1_uuid, 'assigned'::public.conversation_status, agent1_uuid, 'Saya mau tanya soal pesanan saya yang belum datang', now() - interval '2 minutes', 3, 'id', true, 'high', '18 min'),
    (conv2_uuid, contact2_uuid, 'open'::public.conversation_status, null, 'สอบถามเรื่องการคืนสินค้าครับ', now() - interval '5 minutes', 1, 'th', true, 'high', '5 min'),
    (conv3_uuid, contact3_uuid, 'assigned'::public.conversation_status, agent3_uuid, 'Tôi cần hỗ trợ về đơn hàng #VN-9920', now() - interval '12 minutes', 0, 'vi', false, 'normal', null),
    (conv4_uuid, contact4_uuid, 'pending'::public.conversation_status, agent4_uuid, 'என் ஆர்டர் எங்கே உள்ளது?', now() - interval '28 minutes', 2, 'ta', true, 'high', '28 min'),
    (conv5_uuid, contact5_uuid, 'open'::public.conversation_status, null, 'मुझे अपना ऑर्डर कैंसिल करना है', now() - interval '35 minutes', 1, 'hi', false, 'normal', null)
  ON CONFLICT (id) DO NOTHING;

  -- Messages for conv1
  INSERT INTO public.messages (conversation_id, message_type, direction, content, delivery, translated, sent_at)
  VALUES
    (conv1_uuid, 'text'::public.message_type, 'in'::public.message_direction, 'Halo, saya mau tanya soal pesanan saya', 'read'::public.delivery_status, null, now() - interval '30 minutes'),
    (conv1_uuid, 'text'::public.message_type, 'in'::public.message_direction, 'Pesanan SH-8821 sudah 5 hari belum sampai', 'read'::public.delivery_status, 'Order SH-8821 has not arrived after 5 days', now() - interval '29 minutes'),
    (conv1_uuid, 'text'::public.message_type, 'out'::public.message_direction, 'Halo Siti! Terima kasih sudah menghubungi kami. Saya cek dulu ya pesanannya.', 'read'::public.delivery_status, null, now() - interval '28 minutes'),
    (conv1_uuid, 'text'::public.message_type, 'in'::public.message_direction, 'Saya mau tanya soal pesanan saya yang belum datang', 'read'::public.delivery_status, 'I want to ask about my order that hasn''t arrived', now() - interval '2 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- Messages for conv2
  INSERT INTO public.messages (conversation_id, message_type, direction, content, delivery, translated, sent_at)
  VALUES
    (conv2_uuid, 'text'::public.message_type, 'in'::public.message_direction, 'สวัสดีครับ', 'read'::public.delivery_status, 'Hello', now() - interval '10 minutes'),
    (conv2_uuid, 'text'::public.message_type, 'in'::public.message_direction, 'สอบถามเรื่องการคืนสินค้าครับ', 'read'::public.delivery_status, 'I want to ask about returning a product', now() - interval '5 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- KB Articles
  INSERT INTO public.kb_articles (title, category, status, languages, ai_usage_count, deflection_score, author_id, author_name, content, views)
  VALUES
    ('How to track your order', 'Order Tracking', 'published'::public.article_status, ARRAY['en','id','th','vi']::TEXT[], 1247, 94, agent1_uuid, 'Priya Nair', '## How to track your order\n\nYou can track your order in three ways:\n\n**1. Via WhatsApp**\nSimply reply "track [order number]" in this chat and our AI will fetch your real-time tracking status.\n\n**2. Via Shopee/Lazada app**\nGo to Me → My Orders → Find your order → Track Package.\n\n**3. Via courier website**\nUse your tracking number on the JNE, J&T, or SiCepat website.\n\nTracking updates may take 24–48 hours after dispatch.', 3821),
    ('Return and exchange policy', 'Returns & Exchanges', 'published'::public.article_status, ARRAY['en','id','hi']::TEXT[], 892, 87, agent3_uuid, 'Arif Wibowo', '## Return and Exchange Policy\n\nWe accept returns within **7 days** of delivery for the following reasons:\n\n- Item received is damaged or defective\n- Wrong item sent\n- Item does not match the description\n\n**How to initiate a return:**\n1. Take photos of the item and packaging\n2. Send photos to this WhatsApp chat\n3. Our team will approve and arrange a pickup within 24 hours', 2134),
    ('Payment methods accepted', 'Payment & Billing', 'published'::public.article_status, ARRAY['en','id','th']::TEXT[], 634, 91, agent1_uuid, 'Priya Nair', '## Payment Methods\n\nWe accept the following payment methods:\n\n**Online:**\n- Credit/Debit cards (Visa, Mastercard)\n- GoPay, OVO, Dana (Indonesia)\n- PromptPay (Thailand)\n- UPI, Paytm (India)', 1876),
    ('How to cancel an order', 'Order Tracking', 'published'::public.article_status, ARRAY['en','id','hi','ta']::TEXT[], 743, 82, agent4_uuid, 'Kavitha Rajan', '## How to Cancel an Order\n\nOrders can be cancelled **before they are shipped**.\n\n**To cancel:**\n1. Reply "cancel [order number]" in this chat\n2. Our AI will check if cancellation is still possible\n3. If confirmed, your refund will be processed within 3–5 business days', 1654),
    ('Account password reset', 'Account & Profile', 'published'::public.article_status, ARRAY['en','id','th','vi','ta','hi']::TEXT[], 387, 96, agent3_uuid, 'Arif Wibowo', '## Reset Your Password\n\n**Via app:**\n1. Tap "Forgot Password" on the login screen\n2. Enter your registered email or phone number\n3. Check your SMS/email for a 6-digit OTP\n4. Enter OTP and set a new password', 891),
    ('Size guide for clothing items', 'Product Information', 'draft'::public.article_status, ARRAY['en']::TEXT[], 0, 0, agent1_uuid, 'Priya Nair', '## Size Guide\n\n*Draft — pending review by product team before publishing.*', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Billing subscription for admin
  INSERT INTO public.billing_subscriptions (id, user_id, plan_id, billing_cycle, seats_used, seats_total, next_billing_date, current_period_start, current_period_end, monthly_spend)
  VALUES
    (sub_uuid, admin_uuid, 'pro'::public.plan_id, 'monthly'::public.billing_cycle, 6, 10, '2026-06-10', '2026-05-10', '2026-06-10', 149)
  ON CONFLICT (id) DO NOTHING;

  -- Billing invoices
  INSERT INTO public.billing_invoices (subscription_id, user_id, invoice_date, description, amount, status)
  VALUES
    (sub_uuid, admin_uuid, '2026-05-10', 'Pro Plan — May 2026', 149, 'paid'::public.invoice_status),
    (sub_uuid, admin_uuid, '2026-04-10', 'Pro Plan — Apr 2026', 149, 'paid'::public.invoice_status),
    (sub_uuid, admin_uuid, '2026-03-10', 'Pro Plan — Mar 2026', 149, 'paid'::public.invoice_status),
    (sub_uuid, admin_uuid, '2026-02-10', 'Pro Plan — Feb 2026', 149, 'paid'::public.invoice_status),
    (sub_uuid, admin_uuid, '2026-01-10', 'Starter Plan — Jan 2026 (Upgraded)', 49, 'paid'::public.invoice_status),
    (sub_uuid, admin_uuid, '2025-12-10', 'Starter Plan — Dec 2025', 49, 'paid'::public.invoice_status)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
