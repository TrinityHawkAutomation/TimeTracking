import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const BUTTON_COUNT = 12

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#84CC16', '#14B8A6', '#6366F1', '#78716C',
]

// Insert template only - these have no `id`, so they must never reach the grid.
// Rendering them lets a press save a time_entry with a NULL button_id.
const DEFAULT_BUTTONS = Array.from({ length: BUTTON_COUNT }, (_, i) => ({
  position: i,
  label: `Client ${i + 1}`,
  color: COLORS[i],
}))

export function useButtons(userId) {
  const [buttons, setButtons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchButtons = useCallback(async () => {
    if (!userId) return
    setError(null)
    const { data, error } = await supabase
      .from('button_configs')
      .select('*')
      .eq('user_id', userId)
      .order('position')

    if (error) {
      console.error('Error fetching buttons:', error)
      setError('Could not load your buttons. Check your connection and reload.')
      setButtons([])
      setLoading(false)
      return
    }

    if (data.length === 0) {
      // First time user - create default buttons
      const inserts = DEFAULT_BUTTONS.map(b => ({ ...b, user_id: userId }))
      const { data: created, error: insertError } = await supabase
        .from('button_configs')
        .insert(inserts)
        .select()
      if (insertError) {
        console.error('Error creating defaults:', insertError)
        setError('Could not set up your buttons. Reload to try again.')
        setButtons([])
      } else {
        setButtons(created.sort((a, b) => a.position - b.position))
      }
    } else if (data.length < BUTTON_COUNT) {
      // Existing user from before the grid grew - fill in the new slots
      const taken = new Set(data.map(b => b.position))
      const missing = DEFAULT_BUTTONS
        .filter(b => !taken.has(b.position))
        .map(b => ({ ...b, user_id: userId }))

      const { data: added, error: backfillError } = await supabase
        .from('button_configs')
        .insert(missing)
        .select()

      if (backfillError) {
        console.error('Error backfilling buttons:', backfillError)
        setButtons(data)
      } else {
        setButtons([...data, ...added].sort((a, b) => a.position - b.position))
      }
    } else {
      setButtons(data)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchButtons()
  }, [fetchButtons])

  async function updateButton(id, updates) {
    const { error } = await supabase
      .from('button_configs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating button:', error)
      return
    }

    setButtons(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updates } : b))
    )
  }

  return { buttons, loading, error, updateButton, refetch: fetchButtons }
}
