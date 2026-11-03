import './VehicleTastePreview.css';

const examples = {
  exteriorAngularity: {
    0: { image: 'models/ioniq6.webp', model: '현대 아이오닉 6', title: '곡선이 많고 둥근 차', description: '지붕부터 뒤까지 둥글게 이어지는 곡선이 두드러져요.' },
    0.5: { image: 'sonata.webp', model: '현대 쏘나타', title: '균형 잡힌 차', description: '또렷한 앞모습의 선과 부드러운 지붕 곡선이 함께 보여요.' },
    1: { image: 'models/santafe.webp', model: '현대 싼타페', title: '각지고 날카로운 차', description: '반듯한 지붕과 직선 위주의 모서리가 두드러져요.' },
  },
};

export default function VehicleTastePreview({ preference, value }) {
  const example = examples[preference]?.[value];
  if (!example) return null;
  return <figure className="vehicle-taste-preview" aria-live="polite" aria-atomic="true">
    <div className="vehicle-taste-preview-image"><img src={`/images/recommendations/${example.image}`} alt={`${example.title} 예시: ${example.model}`} style={{ objectFit: example.fit ?? 'contain' }} /></div>
    <figcaption><h3>{example.title}</h3><p>{example.description}</p><span>예시 차량 · {example.model}</span></figcaption>
  </figure>;
}
