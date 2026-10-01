---
phase: 02-connexion-multi-appareil
plan: 01
wave: 1
autonomous: true
objective: "Créer le projet Supabase, le schéma de base de données, l'authentification, et les politiques RLS"
files_modified:
  - package.json
  - app.json
  - src/utils/supabase.js
task_count: 5
gap_closure: false
---

# Plan 01: Backend Supabase — projet, schéma DB, auth, RLS, API

## Objective

Créer l'infrastructure backend avec Supabase : projet, tables PostgreSQL, authentification email/mot de passe, Row Level Security (RLS) pour l'isolation des données utilisateur, et client Supabase dans l'app.

## Tasks

### Task 1: Créer le projet Supabase et installer le client

Créer un projet Supabase sur [supabase.com](https://supabase.com), récupérer les clés (anon, URL), installer `@supabase/supabase-js`. Ajouter les configs dans `app.json` (extra).

**Files:** `package.json`, `app.json`

**Sub-tasks:**
- [ ] Créer un projet Supabase (gratuit) via le dashboard
- [ ] Noter l'URL du projet et la clé anon (public)
- [ ] Installer : `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage` (ce dernier existe déjà)
- [ ] Ajouter dans `app.json` → `extra` → `supabaseUrl` et `supabaseAnonKey`

### Task 2: Créer le client Supabase dans src/utils/supabase.js

Initialiser le client Supabase avec `createClient()`, configuré pour utiliser AsyncStorage comme stockage de session (persistance du token entre les lancements).

**Files:** `src/utils/supabase.js`

**Sub-tasks:**
- [ ] Créer `src/utils/supabase.js` avec `createClient(supabaseUrl, supabaseAnonKey, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true } })`
- [ ] Exporter `supabase` client

### Task 3: Schéma de base de données (migration SQL)

Créer les tables dans Supabase via l'éditeur SQL. Chaque table a `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID REFERENCES auth.users NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`.

**Tables SQL:**

```sql
-- Profiles (étend auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  wallet TEXT,
  category TEXT,
  description TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Debts
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  person_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tontines
CREATE TABLE tontines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  group_name TEXT NOT NULL,
  amount_per_tour NUMERIC NOT NULL,
  rounds JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accounting entries
CREATE TABLE accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  description TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  theme TEXT DEFAULT 'Système',
  accent_color TEXT DEFAULT '#3b82f6',
  devise TEXT DEFAULT '€ (EUR)',
  budget_limit NUMERIC DEFAULT 0,
  budget_period TEXT DEFAULT 'month',
  reminder_hour INTEGER DEFAULT 20,
  reminder_minute INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Sub-tasks:**
- [ ] Exécuter le SQL ci-dessus dans l'éditeur SQL Supabase
- [ ] Vérifier que les tables sont créées avec RLS activée par défaut

### Task 4: Politiques Row Level Security (RLS)

Pour chaque table, ajouter des politiques RLS qui limitent l'accès à l'utilisateur propriétaire.

**Politiques SQL:**

```sql
-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Debts, Tontines, Accounting, Settings : même pattern avec user_id
```

**Sub-tasks:**
- [ ] Exécuter toutes les politiques RLS dans l'éditeur SQL
- [ ] Tester avec l'API Supabase que les données sont bien isolées entre utilisateurs

### Task 5: Trigger updated_at automatique

Créer une fonction et des triggers pour mettre à jour `updated_at` automatiquement.

**SQL:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Même trigger pour transactions, debts, tontines, accounting_entries, user_settings
```

**Sub-tasks:**
- [ ] Exécuter le SQL des triggers
- [ ] Vérifier que updated_at se met à jour automatiquement

## Success Criteria

- [ ] Le client Supabase est installé et initialisé dans l'app
- [ ] Les tables (profiles, transactions, debts, tontines, accounting_entries, user_settings) existent dans Supabase
- [ ] Les politiques RLS isolent correctement les données par utilisateur
- [ ] L'authentification email/mot de passe fonctionne via Supabase Auth
- [ ] Le token de session persiste entre les lancements (AsyncStorage)
