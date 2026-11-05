import { useLayoutEffect, useRef } from 'react';

export default function FinancialMoneyInput({ value, onValueChange, decimalPlaces = 2, allowNegative = false, max = 9999999999.99, onChange: _onChange, ...props }) {
  const input = useRef(null);
  const caret = useRef(null);
  const raw = String(value ?? '');
  const [integer, fraction] = raw.split('.');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
  useLayoutEffect(() => {
    if (caret.current === null) return;
    let position = 0;
    let count = 0;
    while (position < formatted.length && count < caret.current) {
      if (formatted[position] !== ',') count++;
      position++;
    }
    input.current?.setSelectionRange(position, position);
    caret.current = null;
  });
  return <input {...props} ref={input} type="text" inputMode="decimal" value={formatted} onChange={event => {
    const next = event.target.value.replaceAll(',', '');
    if (!new RegExp(`^${allowNegative ? "-?" : ""}\\d{0,10}(\\.\\d{0,${decimalPlaces}})?$`).test(next) || Number(next) > max) return;
    caret.current = event.target.value.slice(0, event.target.selectionStart).replaceAll(',', '').length;
    onValueChange(next);
  }} />;
}
