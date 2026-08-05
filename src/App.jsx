import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useDarkMode } from './hooks/useDarkMode'
import { useButtons } from './hooks/useButtons'
import { useTimer } from './hooks/useTimer'
import AuthScreen from './components/AuthScreen'
import Header from './components/Header'
import TimerGrid from './components/TimerGrid'
import SettingsScreen from './components/SettingsScreen'

export default function App() {
  const { user, loading: authLoading, error, signIn, signUp, signOut, setError } = useAuth()
  const { isDark, toggle: toggleDark } = useDarkMode()
  const { buttons, loading: buttonsLoading, error: buttonsError, updateButton } = useButtons(user?.id)
  const { activeIndex, elapsed, handlePress } = useTimer(user?.id, buttons)
  const [screen, setScreen] = useState('grid')

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} error={error} setError={setError} />
  }

  if (buttonsLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <Header
        isDark={isDark}
        onToggleDark={toggleDark}
        onSettings={() => setScreen(screen === 'settings' ? 'grid' : 'settings')}
        onSignOut={signOut}
        screen={screen}
      />
      {buttonsError ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-center text-lg text-red-600 dark:text-red-400">
            {buttonsError}
          </p>
        </div>
      ) : screen === 'settings' ? (
        <SettingsScreen buttons={buttons} onUpdate={updateButton} />
      ) : (
        <TimerGrid
          buttons={buttons}
          activeIndex={activeIndex}
          elapsed={elapsed}
          onPress={handlePress}
        />
      )}
    </div>
  )
}
