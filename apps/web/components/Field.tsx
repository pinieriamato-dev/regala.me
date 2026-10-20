import { cloneElement, useId, type ReactElement, type ReactNode } from 'react'

type Props = {
  label: string
  hint?: string
  error?: string | null
  labelAction?: ReactNode
  children: ReactElement
}

// Connects a visible label, hint and error to one control, so screen readers
// announce the field name and its messages together with the input.
export function Field({ label, hint, error, labelAction, children }: Props) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <label htmlFor={id} className="rg-label">{label}</label>
        {labelAction}
      </div>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined,
      })}
      {hint && <p id={hintId} className="rg-hint">{hint}</p>}
      {error && <p id={errId} role="alert" className="rg-error">{error}</p>}
    </div>
  )
}
