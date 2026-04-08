import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useTimer(userId, buttons) {
  const [activeIndex, setActiveIndex] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Clean up interval on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const startTimer = useCallback((index) => {
    startTimeRef.current = new Date()
    setActiveIndex(index)
    setElapsed(0)
    clearTimer()
    intervalRef.current = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now - startTimeRef.current) / 1000)
      setElapsed(diff)
    }, 1000)
  }, [clearTimer])

  const stopTimer = useCallback(async () => {
    clearTimer()
    const startTime = startTimeRef.current
    const endTime = new Date()
    const currentIndex = activeIndex
    const durationSeconds = Math.floor((endTime - startTime) / 1000)

    setActiveIndex(null)
    setElapsed(0)
    startTimeRef.current = null

    if (!startTime || currentIndex === null || !buttons[currentIndex]) return

    const button = buttons[currentIndex]
    const { error } = await supabase.from('time_entries').insert({
      user_id: userId,
      button_id: button.id,
      label: button.label,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: durationSeconds,
    })

    if (error) {
      console.error('Error saving time entry:', error)
    }
  }, [activeIndex, buttons, userId, clearTimer])

  const handlePress = useCallback(async (index) => {
    if (activeIndex === index) {
      // Stop current timer
      await stopTimer()
    } else if (activeIndex !== null) {
      // Switch: stop current, start new
      await stopTimer()
      startTimer(index)
    } else {
      // Start new timer
      startTimer(index)
    }
  }, [activeIndex, stopTimer, startTimer])

  return { activeIndex, elapsed, handlePress }
}
