export const financialSummarySteps = { deposit: 3, monthlyBudget: 0 };

const labels = {
  minimumSeats: '탑승 인원', costImportance: '비용 성향', assetRetentionImportance: '예금 보존',
  runningCostImportance: '유지비 중요도', designImportance: '윤곽 중요도', performanceImportance: '가속 중요도',
  fuelImportance: '연료 중요도', spaceImportance: '크기 중요도', lifestylePurposeImportance: '목적 중요도',
  exteriorAngularity: '차체 윤곽', accelerationPreference: '가속 느낌', fuel: '선호 연료',
  chargingAvailable: '충전 여건', preferredSize: '차량 길이', preferredHeight: '차량 높이', lifestylePurpose: '사용 목적',
};

export function surveySummary(questions, vehicle) {
  return questions.map(question => {
    const option = question.options?.find(item => String(item.value) === String(vehicle[question.id]));
    return { id: question.id, label: labels[question.id] ?? question.title, value: option?.label ?? '선택 안 함' };
  });
}

export function recordSurveyAnswer(vehicle, id, value = vehicle[id]) {
  return { ...vehicle, [id]: value };
}
