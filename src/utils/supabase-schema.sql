-- ============================================================
-- Migration Supabase — Orane.d FinanceTracker
-- Phase 2 : Connexion multi-appareil
-- Exécuter dans l'éditeur SQL du dashboard Supabase
-- ============================================================

-- --------------------------------------------------
-- 1. TABLES
-- --------------------------------------------------

-- Profiles (extension de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  wallet TEXT DEFAULT 'momo',
  category TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  note TEXT DEFAULT '',
  date TEXT DEFAULT '',
  momoFee NUMERIC DEFAULT 0,
  frais NUMERIC DEFAULT 0,
  amountReceived NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Debts
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  person_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  note TEXT DEFAULT '',
  amount_reimbursed NUMERIC DEFAULT 0,
  date_created TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  status TEXT DEFAULT 'en_cours',
  reminder_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tontines
CREATE TABLE IF NOT EXISTS tontines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  group_name TEXT NOT NULL,
  amount_per_tour NUMERIC NOT NULL,
  frequency TEXT DEFAULT 'mensuelle',
  total_participants INTEGER DEFAULT 1,
  my_position INTEGER DEFAULT 1,
  start_date TEXT DEFAULT '',
  rounds JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Accounting entries (comptabilité)
CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  date TEXT DEFAULT '',
  reference TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  account_code TEXT DEFAULT '',
  account_label TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  theme TEXT DEFAULT 'Système',
  accent_color TEXT DEFAULT '#3b82f6',
  devise TEXT DEFAULT '€ (EUR)',
  budget_limit NUMERIC DEFAULT 0,
  budget_period TEXT DEFAULT 'month',
  reminder_hour INTEGER DEFAULT 20,
  reminder_minute INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- --------------------------------------------------

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can view own profile" ON profiles;
CREATE POLICY "users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "users can insert own profile" ON profiles;
CREATE POLICY "users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can view own transactions" ON transactions;
CREATE POLICY "users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can insert own transactions" ON transactions;
CREATE POLICY "users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can update own transactions" ON transactions;
CREATE POLICY "users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can delete own transactions" ON transactions;
CREATE POLICY "users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can view own debts" ON debts;
CREATE POLICY "users can view own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can insert own debts" ON debts;
CREATE POLICY "users can insert own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can update own debts" ON debts;
CREATE POLICY "users can update own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can delete own debts" ON debts;
CREATE POLICY "users can delete own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);

-- Tontines
ALTER TABLE tontines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can view own tontines" ON tontines;
CREATE POLICY "users can view own tontines" ON tontines
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can insert own tontines" ON tontines;
CREATE POLICY "users can insert own tontines" ON tontines
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can update own tontines" ON tontines;
CREATE POLICY "users can update own tontines" ON tontines
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can delete own tontines" ON tontines;
CREATE POLICY "users can delete own tontines" ON tontines
  FOR DELETE USING (auth.uid() = user_id);

-- Accounting entries
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can view own accounting_entries" ON accounting_entries;
CREATE POLICY "users can view own accounting_entries" ON accounting_entries
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can insert own accounting_entries" ON accounting_entries;
CREATE POLICY "users can insert own accounting_entries" ON accounting_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can update own accounting_entries" ON accounting_entries;
CREATE POLICY "users can update own accounting_entries" ON accounting_entries
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can delete own accounting_entries" ON accounting_entries;
CREATE POLICY "users can delete own accounting_entries" ON accounting_entries
  FOR DELETE USING (auth.uid() = user_id);

-- User settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can view own user_settings" ON user_settings;
CREATE POLICY "users can view own user_settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can insert own user_settings" ON user_settings;
CREATE POLICY "users can insert own user_settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can update own user_settings" ON user_settings;
CREATE POLICY "users can update own user_settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can delete own user_settings" ON user_settings;
CREATE POLICY "users can delete own user_settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------
-- 3. TRIGGER updated_at automatique
-- --------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles', 'transactions', 'debts', 'tontines', 'accounting_entries', 'user_settings'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END;
$$;
