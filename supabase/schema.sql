-- ============================================
-- TimeTracker Database Schema
-- Run this in your Supabase SQL editor
-- ============================================

-- Button configurations (8 per user)
CREATE TABLE IF NOT EXISTS public.button_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0 AND position <= 11),
  label TEXT NOT NULL DEFAULT 'Client',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, position)
);

ALTER TABLE public.button_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own buttons" ON public.button_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_button_configs_user_id
  ON public.button_configs(user_id);

-- Time entries
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  button_id UUID REFERENCES public.button_configs(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own entries" ON public.time_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_id
  ON public.time_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_start_time
  ON public.time_entries(start_time);

-- Auto-create 8 default buttons when a new user signs up
CREATE OR REPLACE FUNCTION public.create_default_buttons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  colors TEXT[] := ARRAY['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#F97316',
                         '#84CC16','#14B8A6','#6366F1','#78716C'];
BEGIN
  FOR i IN 0..11 LOOP
    INSERT INTO public.button_configs (user_id, position, label, color)
    VALUES (NEW.id, i, 'Client ' || (i + 1), colors[i + 1]);
  END LOOP;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_buttons();

-- ============================================
-- Google Sheets sync via Edge Function
-- Requires pg_net extension for async HTTP
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.handle_time_entry_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;

  PERFORM net.http_post(
    url := 'https://bzpaireytureftxjnwbu.supabase.co/functions/v1/sync-google-sheet',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'time_entries',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'user_email', user_email,
        'label', NEW.label,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'duration_seconds', NEW.duration_seconds,
        'created_at', NEW.created_at
      )
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_time_entry_insert ON public.time_entries;
CREATE TRIGGER on_time_entry_insert
  AFTER INSERT ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_time_entry_insert();
