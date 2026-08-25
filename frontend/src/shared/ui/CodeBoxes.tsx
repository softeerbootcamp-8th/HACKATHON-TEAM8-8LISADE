export function CodeBoxes({ id, length, value, onChange, inputMode, size = 'sm', required }: {
  id: string; length: number; value: string; onChange: (value: string) => void
  inputMode?: 'text' | 'numeric'; size?: 'sm' | 'lg'; required?: boolean
}) {
  const boxClassName = size === 'lg' ? 'code-box code-box--lg' : 'code-box'
  const inputClassName = size === 'lg' ? 'code-input code-input--lg' : 'code-input'
  return <div className="code-boxes-wrap">
    <div className="code-boxes" aria-hidden="true">
      {Array.from({ length }, (_, index) => (
        <span key={index} className={value.length === index ? `${boxClassName} is-active` : boxClassName}>{value[index] ?? ''}</span>
      ))}
    </div>
    <input id={id} className={inputClassName} maxLength={length} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} required={required} autoComplete="off" />
  </div>
}
