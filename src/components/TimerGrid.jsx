import TimerButton from './TimerButton'

export default function TimerGrid({ buttons, activeIndex, elapsed, onPress }) {
  return (
    <div className="grid grid-cols-3 landscape:grid-cols-4 auto-rows-fr gap-3 p-3 flex-1 min-h-0">
      {buttons.map((btn, i) => (
        <TimerButton
          key={btn.id ?? i}
          label={btn.label}
          color={btn.color}
          isActive={activeIndex === i}
          elapsed={activeIndex === i ? elapsed : 0}
          onPress={() => onPress(i)}
        />
      ))}
    </div>
  )
}
