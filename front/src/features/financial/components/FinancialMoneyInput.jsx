import { useLayoutEffect, useRef } from 'react';

const removeLeadingZeros = value => value.replace(/^(-?)0+(?=\d)/, '$1');

export default function FinancialMoneyInput({ value, onValueChange, decimalPlaces = 2, allowNegative = false, max = 9999999999.99, onChange: _onChange, ...props }) {
  const input = useRef(null);
  const caret = useRef(null);
  const raw = removeLeadingZeros(String(value ?? ''));
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
    const entered = event.target.value.replaceAll(',', '');
    const next = removeLeadingZeros(entered);
    if (!new RegExp(`^${allowNegative ? "-?" : ""}\\d{0,10}(\\.\\d{0,${decimalPlaces}})?$`).test(next) || Number(next) > max) return;
    const digitsBeforeCaret = event.target.value.slice(0, event.target.selectionStart).replaceAll(',', '').length;
    const removedZeros = entered.length - next.length;
    const signLength = entered.startsWith('-') ? 1 : 0;
    caret.current = digitsBeforeCaret - Math.min(removedZeros, Math.max(0, digitsBeforeCaret - signLength));
    onValueChange(next);
  }} />;
}
