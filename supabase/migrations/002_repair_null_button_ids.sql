-- ============================================
-- Repair time_entries that were saved with a NULL button_id.
--
-- Cause: useButtons seeded React state with DEFAULT_BUTTONS, which is an
-- insert template with no `id`. On a fetch/insert failure the grid still
-- rendered those id-less buttons, so a press wrote button_id = NULL.
-- Fixed app-side; this backfills the rows already written.
--
-- Matches on (user_id, label), which is safe because time_entries stores
-- the label at the time of the press. Safe to re-run.
-- ============================================

UPDATE public.time_entries te
SET button_id = bc.id
FROM public.button_configs bc
WHERE te.button_id IS NULL
  AND bc.user_id = te.user_id
  AND bc.label = te.label;

-- Anything still NULL has no button with a matching label (e.g. the button
-- was renamed after the entry was recorded). Review these by hand:
--
--   SELECT id, label, start_time, duration_seconds
--   FROM public.time_entries
--   WHERE button_id IS NULL
--   ORDER BY start_time DESC;
