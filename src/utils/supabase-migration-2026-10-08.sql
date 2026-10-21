-- ============================================================
-- Orane.d — MIGRATION 2026-10-08
-- Alignement du schéma Supabase sur l'application
--
-- ┌ PROBLÈME ────────────────────────────────────────────────┐
-- │ L'app écrit du camelCase (personName, momoNetwork,       │
-- │ groupName…) avec des ids de type chaîne (Date.now()),    │
-- │ alors que les tables attendaient du snake_case et un     │
-- │ id UUID. RÉSULTAT : 100 % des upsert échouaient         │
-- │ (PGRST204 « colonne inconnue » / 22P02 « uuid invalide ») │
-- │ → la synchronisation multi-appareil n'a jamais marché.   │
-- └──────────────────────────────────────────────────────────┘
--
-- ▸ À EXÉCUTER : Dashboard Supabase → SQL Editor → New query
--   → coller tout ce fichier → Run
--
-- Les tables existantes sont d'abord copiées dans des tables
-- archive_* (sécurité), puis recréées avec le bon format.
--
-- ⚠ Après exécution, redévelopper l'app (les natives pas touchées,
--   mais le bundle change) : npx expo run:android / run:ios
-- ============================================================

-- --------------------------------------------------
-- 1. ARCHIVE (sécurité — rien n'est supprimé définitivement)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS archive_transactions_20261008 AS TABLE transactions;
CREATE TABLE IF NOT EXISTS archive_debts_20261008        AS TABLE debts;
CREATE TABLE IF NOT EXISTS archive_tontines_20261008     AS TABLE tontines;

-- --------------------------------------------------
-- 2. SUPPRESSION DES ANCIENNES TABLES
-- --------------------------------------------------
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS debts        CASCADE;
DROP TABLE IF EXISTS tontines     CASCADE;

-- --------------------------------------------------
-- 3. NOUVELLES TABLES (colonnes = objets envoyés par l'app)
-- --------------------------------------------------
CREATE TABLE transactions (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT,
  amount NUMERIC DEFAULT 0,
  wallet TEXT DEFAULT 'momo',
  category TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  note TEXT,
  date TEXT DEFAULT '',
  "momoNetwork" TEXT,
  "momoFee" NUMERIC DEFAULT 0,
  frais NUMERIC DEFAULT 0,
  "amountReceived" NUMERIC DEFAULT 0,
  "incomeFrequency" TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE debts (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "userId" TEXT,
  type TEXT,
  amount NUMERIC DEFAULT 0,
  "personName" TEXT,
  description TEXT DEFAULT '',
  note TEXT,
  "dueDate" TEXT,
  "reminderEnabled" BOOLEAN DEFAULT false,
  "dateCreated" TEXT DEFAULT '',
  "amountReimbursed" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'en_cours',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE tontines (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "userId" TEXT,
  "groupName" TEXT,
  "amountPerTour" NUMERIC DEFAULT 0,
  frequency TEXT DEFAULT 'mensuelle',
  "totalParticipants" INTEGER DEFAULT 1,
  "myPosition" INTEGER DEFAULT 1,
  "startDate" TEXT DEFAULT '',
  rounds JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

-- --------------------------------------------------
-- 4. ROW LEVEL SECURITY (recréée avec les tables)
-- --------------------------------------------------
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

-- --------------------------------------------------
-- 5. TRIGGER updated_at
-- --------------------------------------------------
-- BUG corrigé : `NEW.updated_at = now();` écrasait l'horodatage posé par le
-- client (`sync.js` grave `updated_at` d'origine dans chaque ligne). Le
-- serveur remplaçait alors la date de la MODIFICATION par celle du PUSH : la
-- fusion multi-appareils (`mergeRecords`, last-write-wins) donnait la priorité
-- au dernier appareil à pousser plutôt qu'à la dernière modification réelle.
-- `COALESCE` ne touche à `updated_at` que s'il est absent.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = COALESCE(NEW.updated_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['transactions', 'debts', 'tontines'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END;
$$;

-- --------------------------------------------------
-- 6. VÉRIFICATION
-- --------------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('transactions', 'debts', 'tontines')
  AND is_nullable = 'NO'
ORDER BY table_name, ordinal_position;
