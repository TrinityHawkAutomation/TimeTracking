import { useState } from 'react'

export default function SettingsScreen({ buttons, onUpdate }) {
  const [saving, setSaving] = useState(null)

  async function handleChange(button, field, value) {
    setSaving(button.id)
    await onUpdate(button.id, { [field]: value })
    setSaving(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        Edit Buttons
      </h2>
      {buttons.map((btn) => (
        <div
          key={btn.id ?? btn.position}
          className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm"
        >
          {/* Color picker */}
          <label className="relative shrink-0">
            <input
              type="color"
              value={btn.color}
              onChange={e => handleChange(btn, 'color', e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <div
              className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
              style={{ backgroundColor: btn.color }}
            />
          </label>

          {/* Label input */}
          <input
            type="text"
            value={btn.label}
            onChange={e =>
              onUpdate(btn.id, { label: e.target.value })
            }
            onBlur={e => handleChange(btn, 'label', e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={30}
          />

          {/* Position indicator */}
          <span className="text-sm text-gray-400 dark:text-gray-500 font-mono w-6 text-center">
            {btn.position + 1}
          </span>

          {saving === btn.id && (
            <span className="text-xs text-blue-500">...</span>
          )}
        </div>
      ))}
    </div>
  )
}
