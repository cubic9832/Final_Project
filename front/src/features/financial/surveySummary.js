export const financialSummarySteps = { deposit: 3, monthlyBudget: 0 };

export function surveySummary(questions, vehicle) {
  return questions.map(question => {
    const option = question.options?.find(item => String(item.value) === String(vehicle[question.id]));
    return { id: question.id, label: question.title, value: option?.label ?? '선택 안 함' };
  });
}

export function recordSurveyAnswer(vehicle, id, value = vehicle[id]) {
  return { ...vehicle, [id]: value };
}
