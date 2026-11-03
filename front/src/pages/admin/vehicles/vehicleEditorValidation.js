
// AdminVehicleRequest의 제약과 일치시킨다. managed_vehicles.payload는 JSON 컬럼이다.
const textLimits = { brand: 40, model: 100, trim: 300, source: 200, sourceUrl: 2000, memo: 1000 };
const numericRules = {
  year: { maxLength: 4, edit: /^[0-9]{0,4}$/, full: /^[0-9]{4}$/, message: '연식은 숫자 4자리로 입력해 주세요.' },
  price: { maxLength: 12, edit: /^(?:[0-9]{1,7}(?:\.[0-9]{0,4})?)?$/, full: /^[0-9]+(?:\.[0-9]{1,4})?$/, min: 0.0001, max: 1000000, message: '가격은 0원 초과, 100억 원 이하로 입력해 주세요. 만 원 단위로 소수점 4자리까지 입력할 수 있습니다.' },
  efficiency: { maxLength: 6, edit: /^(?:[0-9]{1,3}(?:\.[0-9]{0,2})?)?$/, full: /^[0-9]+(?:\.[0-9]{1,2})?$/, min: Number.MIN_VALUE, max: 200, message: '연비·전비는 0 초과, 200 이하로 소수점 2자리까지 입력해 주세요.' },
  seats: { maxLength: 2, edit: /^[0-9]{0,2}$/, full: /^[0-9]+$/, min: 1, max: 15, message: '승차 정원은 1~15 사이의 정수로 입력해 주세요.' },
  length: { maxLength: 4, edit: /^[0-9]{0,4}$/, full: /^[0-9]+$/, min: 2500, max: 6000, message: '전장은 2500~6000mm 사이의 정수로 입력해 주세요.' },
};
for (const name of ['monthlyInsurance', 'monthlyTax', 'monthlyMaintenance']) numericRules[name] = {
  maxLength: 8, edit: /^[0-9]{0,8}$/, full: /^[0-9]+$/, min: 0, max: 10000000, message: '월 유지비는 0~10,000,000원 사이의 정수로 입력해 주세요.',
};

export function vehicleInputAttributes(name) {
  const rule = numericRules[name];
  if (rule) return { maxLength: rule.maxLength, inputMode: ['price', 'efficiency'].includes(name) ? 'decimal' : 'numeric', pattern: rule.full.source.replace(/^\^|\$$/g, '') };
  return textLimits[name] ? { maxLength: textLimits[name] } : {};
}

export function vehicleInputError(name, value, complete = false) {
  const limit = textLimits[name];
  if (limit && String(value ?? '').length > limit) return '최대 ' + limit + '자까지 입력할 수 있습니다.';
  const rule = numericRules[name];
  if (!rule || value === '' || value == null) return '';
  const raw = String(value);
  if (!(complete ? rule.full : rule.edit).test(raw) || raw.length > rule.maxLength) return rule.message;
  if (name !== 'year' && (Number(raw) > rule.max || (complete && Number(raw) < rule.min))) return rule.message;
  return '';
}

export function validateVehicleDraft(draft) {
  const errors = {};
  for (const name of [...Object.keys(textLimits), ...Object.keys(numericRules)]) {
    const error = vehicleInputError(name, draft[name], true);
    if (error) errors[name] = error;
  }
  for (const name of ['brand', 'model', 'trim', 'price']) if (!String(draft[name] ?? '').trim()) errors[name] = '필수 입력 항목입니다.';
  if (draft.sourceUrl) {
    try { const url = new URL(draft.sourceUrl); if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) errors.sourceUrl = 'http 또는 https 주소를 입력해 주세요.'; }
    catch { errors.sourceUrl = '올바른 http 또는 https 주소를 입력해 주세요.'; }
  }
  if (draft.checkedOn) {
    const date = new Date(draft.checkedOn + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.checkedOn) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.checkedOn) errors.checkedOn = '올바른 확인일을 입력해 주세요.';
  }
  if (draft.status === '공개') {
    for (const name of ['seats', 'length', 'efficiency', 'sourceUrl', 'checkedOn']) if (!draft[name]) errors[name] = '차량을 공개하려면 입력해 주세요.';
    if (!draft.body || draft.body === '형태 미확인') errors.body = '공식 사양에 맞는 차체 형태를 선택해 주세요.';
  }
  return errors;
}
