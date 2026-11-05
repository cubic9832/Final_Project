import { formatAmount } from './vehicleData.js';

const koreanTrimNames = {
  Premium: '프리미엄',
  'Exclusive (익스 클루시브)': '익스클루시브',
  Exclusive: '익스클루시브',
  'Inspiration (인스퍼 레이션)': '인스퍼레이션',
  Inspiration: '인스퍼레이션',
};

export function vehicleTrimOptions(variants) {
  const names = variants.map(variant => {
    const name = variant.trimName?.trim() || variant.trim?.split(' · ')[0] || '기본 모델';
    return koreanTrimNames[name] ?? name;
  });

  const options = variants.map((variant, index) => {
    const name = names[index];
    const peers = variants.filter((_, peer) => peer !== index && names[peer] === name);
    if (!peers.length) return { id: variant.id, label: name };

    const fields = [
      item => item.powertrain?.trim(),
      item => item.modelYear && `${item.modelYear}년형`,
      item => formatAmount(item.price),
    ];
    const distinct = fields.find(field => field(variant) && peers.every(peer => field(peer) !== field(variant)));
    const suffix = distinct ? distinct(variant) : fields.map(field => field(variant)).filter(Boolean).join(' · ');
    return { id: variant.id, label: `${name} · ${suffix}` };
  });

  const counts = new Map();
  return options.map(option => {
    if (options.filter(peer => peer.label === option.label).length === 1) return option;
    const number = (counts.get(option.label) ?? 0) + 1;
    counts.set(option.label, number);
    return { ...option, label: `${option.label} (${number})` };
  });
}
