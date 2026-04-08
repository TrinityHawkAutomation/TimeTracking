import { formatTime } from '../utils/formatTime'

export default function TimerButton({ label, color, isActive, elapsed, onPress }) {
  // Compute readable text color based on background brightness
  function textColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#1a1a1a' : '#ffffff'
  }

  return (
    <button
      onClick={onPress}
      className={`
        relative flex flex-col items-center justify-center
        rounded-2xl font-bold text-center
        transition-all duration-200 active:scale-95
        ${isActive ? 'ring-4 ring-white/70 shadow-2xl scale-[1.02]' : 'shadow-md'}
      `}
      style={{
        backgroundColor: color,
        color: textColor(color),
      }}
    >
      {isActive && (
        <span className="absolute top-2 right-3 w-3 h-3 rounded-full bg-white/80 animate-pulse" />
      )}
      <span className="text-xl sm:text-2xl leading-tight px-2 truncate max-w-full">
        {label}
      </span>
      {isActive && (
        <span className="text-3xl sm:text-4xl font-mono mt-1 tabular-nums">
          {formatTime(elapsed)}
        </span>
      )}
    </button>
  )
}
