import { vehicleInputAttributes, vehicleInputError, validateVehicleDraft } from './vehicleEditorValidation.js';
import { formatVehiclePrice } from '../formatVehiclePrice.js';
import { useEffect, useRef, useState } from 'react';
import { Car, ImagePlus } from 'lucide-react';
import theme from '../../../styles/theme';
import AdminEditorFrame from '../components/AdminEditorFrame.jsx';
import { emptyVehicle, vehicleFuels, vehicleStatuses } from './vehicleManagementExamples.js';

function VehicleField({ name, label, value, onChange, options, suffix, required, error, ...props }) {
  const id = `vehicle-editor-${name}`;
  return <div className="vehicle-editor-field"><label htmlFor={id}>{label}{required && <span className="vehicle-editor-required"> *</span>}</label><div className="vehicle-editor-input-wrap">
    {options ? <select id={id} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => onChange(name, event.target.value)} {...props}>{options.map(option => <option key={option}>{option}</option>)}</select>
      : <input id={id} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => { if (onChange(name, event.target.value) === false) event.target.value = value ?? ''; }} required={required} {...props} />}{suffix && <span>{suffix}</span>}
  </div>{error && <p id={`${id}-error`} className="vehicle-editor-error">{error}</p>}</div>;
}

export default function VehicleEditor({ vehicle, onCancel, onSave, saving = false, saveError = '', fieldErrors = {}, onDelete, onClone }) {
  const initial = { ...emptyVehicle, ...vehicle };
  const [draft, setDraft] = useState(initial);
  const [imageError, setImageError] = useState('');
  const [readingImage, setReadingImage] = useState(false);
  const [errors, setErrors] = useState({});
  const picker = useRef(null);
  const reader = useRef(null);
  const editing = Boolean(vehicle?.id);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useEffect(() => {
    return () => reader.current?.abort();
  }, []);
  const change = (name, value) => {
    const error = vehicleInputError(name, value);
    if (error) return false;
    setDraft(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' }));
    return true;
  };
  const field = (name, label, props = {}) => <VehicleField name={name} label={label} value={draft[name]} onChange={change} error={errors[name] || fieldErrors[name]} disabled={saving} {...props} {...vehicleInputAttributes(name)} />;
  function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/webp', 'image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setImageError('5MB 이하의 WebP, PNG, JPG 이미지를 선택해 주세요.'); return;
    }
    reader.current?.abort();
    const next = new FileReader(); reader.current = next;
    setReadingImage(true); setImageError('');
    next.onload = () => { setDraft(current => ({ ...current, image: next.result, imageFile: file })); setReadingImage(false); };
    next.onerror = () => { setImageError('이미지를 읽지 못했어요. 다른 파일을 선택해 주세요.'); setReadingImage(false); };
    next.readAsDataURL(file);
  }
  function save(event) {
    event.preventDefault();
    if (readingImage || saving) return;
    const invalid = validateVehicleDraft(draft);
    for (const input of event.currentTarget.elements) {
      if (input.id?.startsWith('vehicle-editor-') && input.validity && !input.validity.valid) invalid[input.id.replace('vehicle-editor-', '')] ||= '입력 형식과 필수값을 확인해 주세요.';
    }
    setErrors(invalid);
    if (Object.keys(invalid).length) { document.getElementById(`vehicle-editor-${Object.keys(invalid)[0]}`)?.focus(); return; }
    onSave(draft);
  }
  return <form className="vehicle-management vehicle-editor" aria-label={editing ? '차량 정보 수정' : '새 차량 등록'} onSubmit={save} noValidate>
    <AdminEditorFrame title={editing ? '차량 수정' : '차량 등록'} onCancel={onCancel} isDirty={dirty} busy={saving} saveDisabled={readingImage} onDelete={onDelete} deleteError={saveError} deleteMessage="차량을 삭제할까요? 삭제된 차량은 추천에서 제외되며 나중에 복구할 수 있습니다." secondaryActions={editing && onClone && <button type="button" className="admin-outline-button" disabled={saving || readingImage} onClick={() => onClone(draft)}>복제해서 등록</button>}>
    <div className="vehicle-editor-layout"><div className="admin-panel-stack">
      <section className="admin-card"><div className="admin-card-heading"><div><h3>기본 정보</h3><p><span className="vehicle-editor-required">*</span> 표시는 필수 입력사항입니다.</p></div></div><div className="vehicle-editor-fields">
        {field('brand', '브랜드', { required: true, placeholder: '예: 현대, 기아, BMW' })}
        {field('model', '모델명', { required: true, placeholder: '예: 쏘나타, 스포티지' })}
        {field('year', '연식', { placeholder: '예: 2026', suffix: '년형' })}
        {field('trim', '트림명', { required: true, placeholder: '예: 프레스티지' })}
        {field('origin', '구분', { options: ['국산', '수입'] })}
        {field('body', '차체 종류', { options: ['형태 미확인', '세단', 'SUV', '해치백', '왜건', '미니밴·승합', '박스카', '픽업트럭', '쿠페', '컨버터블', '로드스터'] })}
      </div></section>
      <section className="admin-card"><div className="admin-card-heading"><div><h3>가격과 차량 사양</h3><p>선택 옵션을 제외한 해당 구성의 가격과 기본 사양입니다.</p></div></div><div className="vehicle-editor-fields">
        {field('price', '판매 가격', { required: true, placeholder: '예: 2892', suffix: '만 원' })}
        {field('fuel', '연료', { options: vehicleFuels })}
        {field('efficiency', draft.fuel === '전기' ? '복합 전비' : '복합 연비', { inputMode: 'decimal', placeholder: '예: 12.6', suffix: draft.fuel === '전기' ? 'km/kWh' : 'km/L' })}
        {field('drive', '구동 방식', { options: ['2WD', '4WD', 'AWD', '미확인'] })}
        {field('seats', '기본 승차 정원', { placeholder: '예: 5', suffix: '명' })}
        {field('length', '전장', { placeholder: '예: 4905', suffix: 'mm' })}
      </div></section>
      <section className="admin-card"><div className="admin-card-heading"><div><h3>월 예상 유지비</h3><p>미입력은 공통 추정값, 0은 비용 없음입니다. 연료비는 연비와 주행거리로 별도 계산합니다.</p></div></div><div className="vehicle-editor-fields">
        {field('monthlyInsurance', '보험료', { inputMode: 'numeric', suffix: '원/월' })}
        {field('monthlyTax', '자동차세', { inputMode: 'numeric', suffix: '원/월' })}
        {field('monthlyMaintenance', '정비비', { inputMode: 'numeric', suffix: '원/월' })}
      </div></section>
      <section className="admin-card"><div className="admin-card-heading"><div><h3>자료 출처</h3><p>가격과 제원을 확인한 자료를 연결해 주세요.</p></div></div><div className="vehicle-editor-fields">
        {field('source', '자료명', { placeholder: '예: 제조사 공식 가격표' })}
        {field('checkedOn', '확인일', { type: 'date' })}
        <div className="vehicle-editor-wide">{field('sourceUrl', '출처 URL', { type: 'url', placeholder: 'https://' })}</div>
        <div className="vehicle-editor-wide vehicle-editor-field"><label htmlFor="vehicle-editor-memo">관리 메모</label><textarea id="vehicle-editor-memo" disabled={saving} rows={3} value={draft.memo} {...vehicleInputAttributes('memo')} aria-invalid={Boolean(errors.memo || fieldErrors.memo)} aria-describedby={errors.memo || fieldErrors.memo ? 'vehicle-editor-memo-error' : undefined} onChange={event => change('memo', event.target.value)} placeholder="확인할 사항이나 변경 이유를 남겨 주세요." />{(errors.memo || fieldErrors.memo) && <p id="vehicle-editor-memo-error" className="vehicle-editor-error">{errors.memo || fieldErrors.memo}</p>}</div>
      </div></section>
    </div><aside className="vehicle-editor-aside">
      <section className="admin-card vehicle-editor-preview"><div className="admin-card-heading"><div><h3>차량 이미지</h3><p>사용자 화면에 표시할 이미지입니다.</p></div></div><div className="vehicle-editor-image">{draft.image ? <img src={draft.image} alt={`${draft.brand} ${draft.model} 미리보기`} /> : <div><Car size={theme.iconSize.lg} aria-hidden="true" /><span>차량 이미지를 추가해 주세요.</span></div>}</div>
        <input ref={picker} type="file" accept="image/webp,image/png,image/jpeg" className="admin-sr-only" aria-label="차량 이미지 파일" onChange={upload} />
        <button type="button" className="admin-outline-button" disabled={readingImage || saving} onClick={() => picker.current?.click()}><ImagePlus size={theme.iconSize.sm} aria-hidden="true" />{readingImage ? '이미지 읽는 중' : draft.image ? '이미지 변경' : '이미지 선택'}</button>{draft.image && <button type="button" className="admin-outline-button" disabled={readingImage || saving} onClick={() => { change('image', ''); change('imageFile', null); if (picker.current) picker.current.value = ''; }}>이미지 제거</button>}<p className="vehicle-editor-hint">WebP, PNG, JPG · 최대 5MB<br />배경 없는 전면 사선 이미지를 권장해요.</p>{imageError && <p className="vehicle-editor-error" role="alert">{imageError}</p>}
        <div className="vehicle-editor-preview-info"><small>{draft.brand || '브랜드'} · {draft.fuel}</small><h4>{draft.model || '모델명'}</h4><p>{draft.trim || '트림명'}</p><strong>{draft.price ? formatVehiclePrice(draft.price) : '가격 미입력'}</strong></div>
      </section>
      <section className="admin-card"><div className="admin-card-heading"><div><h3>관리 상태</h3><p>목록에 표시할 상태를 선택하세요.</p></div></div>{field('status', '상태', { options: vehicleStatuses })}<p className="vehicle-editor-hint">공개한 차량만 다음 추천 요청부터 반영됩니다. 판매 종료로 변경하면 추천에서 제외됩니다.</p></section>
    </aside></div>
    {saveError && <p className="vehicle-editor-error" role="alert">{saveError}</p>}
    </AdminEditorFrame>
  </form>;
}
