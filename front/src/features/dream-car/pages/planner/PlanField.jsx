import { useEffect, useRef } from 'react';

export default function PlanField({ name, label, unit, inputs, onChange, readOnly = false, min = 0, max = 100000000 }) {
  const fieldRef = useRef(null);
  useEffect(() => {
    const field = fieldRef.current;
    function preventWheelChange(event) {
      if (document.activeElement === field) event.preventDefault();
    }
    field.addEventListener('wheel', preventWheelChange, { passive: false });
    return () => field.removeEventListener('wheel', preventWheelChange);
  }, []);
  if (name === 'targetMonths') max = 1200;
  const value = inputs[name];
  const invalid = value === '' || !Number.isFinite(value) || value < min || value > max || (name === 'targetMonths' && !Number.isInteger(value));
  return <label className="dream-field"><span>{label}</span><div><input ref={fieldRef} type="number" min={min} max={max} step={name === 'targetMonths' ? '1' : 'any'} value={value} readOnly={readOnly} aria-invalid={invalid} aria-describedby={invalid ? `error-${name}` : undefined} onChange={event => onChange(name, event.target.value === '' ? '' : Number(event.target.value))} /><span>{unit}</span></div>{invalid && <small id={`error-${name}`} role="alert">{name === 'targetMonths' ? '1~1,200개월의 정수로 입력해 주세요.' : `${min}~${max.toLocaleString()} 범위로 입력해 주세요.`}</small>}</label>;
}
