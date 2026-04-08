export default function Header({ isDark, onToggleDark, onSettings, onSignOut, screen }) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <h1 className="text-lg font-bold text-gray-900 dark:text-white">
        TimeTracker
      </h1>
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl"
          aria-label="Toggle dark mode"
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Settings / Back */}
        <button
          onClick={onSettings}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl"
          aria-label={screen === 'settings' ? 'Back to timer' : 'Settings'}
        >
          {screen === 'settings' ? '←' : '⚙️'}
        </button>

        {/* Logout */}
        <button
          onClick={onSignOut}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
