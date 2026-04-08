import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const DEFAULT_BUTTONS = Array.from({ length: 8 }, (_, i) => ({
  position: i,
  label: `Client ${i + 1}`,
  color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'][i],
}))

export function useButtons(userId) {
  const [buttons, setButtons] = useState(DEFAULT_BUTTONS)
  const [loading, setLoading] = useState(true)

  const fetchButtons = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('button_configs')
      .select('*')
      .eq('user_id', userId)
      .order('position')

    if (error) {
      console.error('Error fetching buttons:', error)
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
      } else {
        setButtons(created.sort((a, b) => a.position - b.position))
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

  return { buttons, loading, updateButton, refetch: fetchButtons }
}
