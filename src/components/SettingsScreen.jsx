import { useState } from 'react'

function ButtonRow({ button, onUpdate }) {
  const [label, setLabel] = useState(button.label)
  const [saving, setSaving] = useState(false)

  async function save(updates) {
    setSaving(true)
    const { error } = await onUpdate(button.id, updates)
    setSaving(false)
    return !error
  }

  // Typing only touches local state - the write happens once, on blur.
  async function commitLabel() {
    const next = label.trim()
    if (!next || next === button.label) {
      setLabel(button.label)
      return
    }
    setLabel(next)
    if (!await save({ label: next })) setLabel(button.label)
  }

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
      {/* Color picker */}
      <label className="relative shrink-0">
        <input
          type="color"
          value={button.color}
          onChange={e => save({ color: e.target.value })}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
        <div
          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
          style={{ backgroundColor: button.color }}
        />
      </label>

      {/* Label input */}
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        maxLength={30}
      />

      {/* Position indicator */}
      <span className="text-sm text-gray-400 dark:text-gray-500 font-mono w-6 text-center">
        {button.position + 1}
      </span>

      {saving && <span className="text-xs text-blue-500">...</span>}
    </div>
  )
}

export default function SettingsScreen({ buttons, onUpdate }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        Edit Buttons
      </h2>
      {buttons.map(btn => (
        <ButtonRow key={btn.id ?? btn.position} button={btn} onUpdate={onUpdate} />
      ))}
    </div>
  )
}
