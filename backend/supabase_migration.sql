-- Supabase Migration: TaskTracker tables
-- Run this in your Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  goal TEXT DEFAULT '',
  detected_goal TEXT DEFAULT '',
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_active_date TIMESTAMPTZ,
  completed_tasks_count INTEGER DEFAULT 0,
  mode TEXT DEFAULT 'simple' CHECK (mode IN ('ultimate', 'simple')),
  settings JSONB DEFAULT '{
    "aiMode": "auto",
    "userOpenAIKey": "",
    "reminder15min": false,
    "darkMode": true,
    "pushNotifications": true,
    "pushSubscription": null
  }'::jsonb,
  weak_areas TEXT[] DEFAULT '{}',
  productivity_pattern TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  category TEXT DEFAULT 'General',
  goal_tag TEXT DEFAULT '',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 60,
  deadline TIMESTAMPTZ,
  link TEXT DEFAULT '',
  xp_reward INTEGER DEFAULT 10,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')),
  completed_at TIMESTAMPTZ,
  reminder_15min BOOLEAN DEFAULT false,
  scheduled_jobs TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'excel', 'simple')),
  adjusted_from_original BOOLEAN DEFAULT false,
  original_start_time TIMESTAMPTZ,
  motivation_quote TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure end_time exists even if table was already created
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='end_time') THEN
    ALTER TABLE tasks ADD COLUMN end_time TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_user_start ON tasks(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_deadline ON tasks(user_id, deadline);

-- Shopping Lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Shopping List',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  reminder_time TIMESTAMPTZ,
  total_cost NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'excel', 'ocr')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping Items table (separate table instead of nested array)
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT '',
  cost NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  checked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('reminder', 'deadline', 'critical', 'xp', 'simple', 'shopping')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  quote TEXT DEFAULT '',
  link TEXT DEFAULT '',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER shopping_lists_updated_at BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS notification_logs_updated_at ON notification_logs;
CREATE TRIGGER notification_logs_updated_at BEFORE UPDATE ON notification_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: allow service_role full access (backend uses service key via anon key)
-- Since the backend handles auth via JWT, we allow all operations through the API key
DROP POLICY IF EXISTS "Allow all for service" ON users;
CREATE POLICY "Allow all for service" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service" ON tasks;
CREATE POLICY "Allow all for service" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service" ON shopping_lists;
CREATE POLICY "Allow all for service" ON shopping_lists FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service" ON shopping_items;
CREATE POLICY "Allow all for service" ON shopping_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service" ON notification_logs;
CREATE POLICY "Allow all for service" ON notification_logs FOR ALL USING (true) WITH CHECK (true);
