const importanceOptions = (low, middle, high) => [
  { value: '1', label: low }, { value: '3', label: middle }, { value: '5', label: high },
];
const importance = (id, title, description, labels, category = '나의 우선순위') => ({ id, title, description, category, options: importanceOptions(...labels) });

export const incomeRatioValues = ['0', '5', '10', '15', '20', '25', '30', '35', '40'];
export const paymentMonthValues = ['0', '6', '12', '18', '24', '36', '48', '60', '72'];

export function environmentQuestions(scenarioMode, vehicle = {}) {
  const questions = [
    { id: 'minimumSeats', category: '함께 탈 사람', title: '몇 명이 함께 탈 차를 찾으세요?', description: '운전자도 포함해 주세요. 이 인원보다 좌석이 적은 차는 추천하지 않아요.', compact: true,
      options: [{value:'0',label:'상관없어요'}, ...[2,3,4,5,6,7,8,9].map(n => ({value:String(n),label:`${n}명 이상`}))] },
    importance('costImportance', '차량 비용을 얼마나 아끼고 싶으세요?', '구매 가능한 예산 안에서 추천 가격대를 정해요.', [
      '취향이 더 중요해요', '비용과 취향을 함께 봐요', '비용을 아끼고 싶어요',
    ]),
    { id: 'incomeRatio', category: '매달 차에 쓸 돈', title: '월 소득의 몇 %까지 차에 쓸 수 있나요?', description: '할부금과 보험료·세금·정비비·연료비 같은 유지비를 합친 금액이에요. 예금만 고르면 매달 소득은 유지비에만 쓰고, 일시불로 살 수 있는 차만 추천해요.', compact: true,
      options: incomeRatioValues.map(value => value === '0' ? { value, label: '예금만' } : { value, label: `${value}%까지` }) },
  ];
  if (vehicle.incomeRatio && vehicle.incomeRatio !== '0') questions.push(
    { id: 'paymentMonths', category: '할부 기간', title: '몇 개월 동안 나눠 낼까요?', description: '예금을 먼저 쓰고 남은 금액을 연 6% 할부로 나눠 내는 기준이에요. 실제 대출 금리·심사와는 달라요.', compact: true,
      options: paymentMonthValues.map(value => value === '0' ? { value, label: '일시불' } : { value, label: `${value}개월` }) },
  );
  if (scenarioMode) questions.push(
    importance('assetRetentionImportance', '차를 산 뒤, 예금을 얼마나 남길까요?', '예금을 남기는 것과 마음에 드는 차 사이의 우선순위예요.', ['마음에 들면 써도 괜찮아요','어느 정도 남기고 싶어요','최대한 남기고 싶어요']),
    importance('runningCostImportance', '매달 유지비는 얼마나 중요하세요?', '연료비, 보험료, 세금, 정비비를 함께 비교해요.', ['취향이 더 중요해요','유지비와 취향을 함께 봐요','유지비를 아끼고 싶어요']),
  );
  questions.push(
    importance('designImportance', '마음에 드는 차의 윤곽, 얼마나 중요하세요?', '둥근 차인지 각진 차인지는 다음 단계에서 골라요.', ['다른 조건이 더 중요해요','골고루 보고 싶어요','원하는 윤곽이 중요해요']),
    importance('performanceImportance', '원하는 가속 느낌이 얼마나 중요하세요?', '무조건 빠른 차를 고르는 질문은 아니에요. 내 취향과의 일치를 비교해요.', ['다른 조건이 더 중요해요','골고루 보고 싶어요','원하는 가속 느낌이 중요해요']),
    importance('fuelImportance', '원하는 연료가 얼마나 중요하세요?', '원하는 연료가 없으면 다음 단계에서 상관없음을 고를 수 있어요.', ['다른 조건이 더 중요해요','골고루 보고 싶어요','원하는 연료가 중요해요']),
    importance('spaceImportance', '원하는 차 크기가 얼마나 중요하세요?', '큰 차인지 작은 차인지는 다음 단계에서 골라요.', ['다른 조건이 더 중요해요','골고루 보고 싶어요','원하는 크기가 중요해요']),
  );
  if (!scenarioMode) questions.push(importance('lifestylePurposeImportance','차를 쓰는 목적이 얼마나 중요하세요?','출퇴근이나 가족 이동처럼 주로 쓰는 목적을 고려해요.',['다른 조건이 더 중요해요','골고루 보고 싶어요','사용 목적이 중요해요']));
  return questions;
}

export function vehicleQuestions(vehicle, scenarioMode) {
  const questions = [
    {id:'exteriorAngularity',category:'차의 첫인상',title:'어떤 형태의 차를 원하세요?',description:'마음에 드는 모습을 골라 주세요. 선택하면 아래에 예시가 보여요.',options:[
      {value:'any',label:'상관없어요'}, {value:'0',label:'곡선이 많고 둥근 차'}, {value:'0.5',label:'균형 잡힌 차'}, {value:'1',label:'각지고 날카로운 차'},
    ]},
    {id:'accelerationPreference',category:'운전하는 느낌',title:'어느 정도의 속도감을 원하세요?',description:'출발해서 시속 100km까지 속도가 붙는 느낌을 비교해요.',options:[
      {value:'any',label:'상관없어요'}, {value:'0',label:'부드럽고 완만하게'}, {value:'0.5',label:'균형 잡힌 속도감'}, {value:'1',label:'강하고 빠르게'},
    ]},
    {id:'fuel',category:'연료 선택',title:'어떤 연료를 쓰는 차가 좋으세요?',description:'아직 정하지 않았다면 상관없음을 골라도 괜찮아요.',options:[
      ['상관없음','상관없어요'],['가솔린','휘발유'],['하이브리드','하이브리드'],['디젤','경유'],['전기','전기'],['LPG','LPG'],
    ].map(([value,label]) => ({value,label}))},
  ];
  if (scenarioMode && vehicle.fuel === '전기') questions.push({id:'chargingAvailable',category:'충전 여건',title:'집이나 직장에서 충전할 수 있나요?',description:'평소 충전할 수 있는 곳이 있는지 알려주세요.',options:[{value:false,label:'충전할 곳이 없어요'},{value:true,label:'충전할 수 있어요'}]});
  questions.push({id:'preferredSize',category:'차의 길이',title:'어느 정도 길이의 차가 좋으세요?',description:'차의 앞에서 뒤까지 전체 길이 기준이에요. 실내 넓이와는 다를 수 있어요.',options:[
    {value:'any',label:'상관없어요'}, {value:'small',label:'길이 4.2m 이하'}, {value:'medium',label:'길이 4.2~4.8m'}, {value:'large',label:'길이 4.8m 이상'},
  ]}, {id:'preferredHeight',category:'차의 높이',title:'어느 정도 높이의 차가 좋으세요?',description:'차량의 전고 기준이에요. 1.4m와 1.7m는 각각 다음 구간에 포함돼요.',options:[
    {value:'any',label:'상관없어요'}, {value:'low',label:'높이 1.1~1.4m'}, {value:'medium',label:'높이 1.4~1.7m'}, {value:'high',label:'높이 1.7~2.0m'},
  ]});
  if (!scenarioMode) questions.push({id:'lifestylePurpose',category:'주로 쓰는 목적',title:'차를 주로 어떻게 쓰실 건가요?',description:'가장 가까운 목적을 골라 주세요.',options:[{value:'any',label:'정해진 목적은 없어요'},{value:'commute',label:'출퇴근과 도심 이동'},{value:'family',label:'가족과 함께 이동'}]});
  return questions;
}
