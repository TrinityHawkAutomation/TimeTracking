-- ============================================
-- Expand the timer grid from 8 buttons to 12
-- Run this in the Supabase SQL editor BEFORE deploying the app changes,
-- otherwise the new position values (8-11) are rejected by the CHECK.
-- Safe to re-run.
-- ============================================

-- 1. Allow positions 0-11 instead of 0-7
ALTER TABLE public.button_configs
  DROP CONSTRAINT IF EXISTS button_configs_position_check;

ALTER TABLE public.button_configs
  ADD CONSTRAINT button_configs_position_check
  CHECK (position >= 0 AND position <= 11);

-- 2. Give every existing user the 4 new slots
INSERT INTO public.button_configs (user_id, position, label, color)
SELECT u.id, p.position, 'Client ' || (p.position + 1), p.color
FROM auth.users u
CROSS JOIN (VALUES
  (8,  '#84CC16'),
  (9,  '#14B8A6'),
  (10, '#6366F1'),
  (11, '#78716C')
) AS p(position, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.button_configs bc
  WHERE bc.user_id = u.id AND bc.position = p.position
);

-- 3. New signups get 12 buttons, not 8
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
