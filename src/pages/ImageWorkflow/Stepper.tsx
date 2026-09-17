// Visual progress indicator for the 4-step wizard. A step is clickable
// only once it (or an earlier step) has already been reached, so users
// can revisit earlier steps but never skip ahead of where they've got to.
export type WizardStep = 1 | 2 | 3 | 4

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: 'Upload' },
  { step: 2, label: 'Choose Operations' },
  { step: 3, label: 'Process' },
  { step: 4, label: 'Download' },
]

interface StepperProps {
  current: WizardStep
  maxReached: WizardStep
  onNavigate: (step: WizardStep) => void
}

export function Stepper({ current, maxReached, onNavigate }: StepperProps) {
  return (
    <ol className="stepper">
      {STEPS.map(({ step, label }) => {
        const isCompleted = step < maxReached
        const isCurrent = step === current
        const isReachable = step <= maxReached
        return (
          <li key={step} className="stepper__item">
            <button
              type="button"
              className={`stepper__button${isCurrent ? ' stepper__button--current' : ''}${
                isCompleted ? ' stepper__button--completed' : ''
              }`}
              disabled={!isReachable}
              onClick={() => onNavigate(step)}
            >
              <span className="stepper__dot">{isCompleted ? '✓' : step}</span>
              <span className="stepper__label">{label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
