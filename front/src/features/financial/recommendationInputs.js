const financialKeys = ['values', 'assets', 'loans', 'loanDetails', 'loanPayment', 'detailedLoans', 'detailed', 'expenseBreakdown'];
const vehicleKeys = ['minimumSeats', 'incomeRatio', 'paymentMonths', 'costImportance', 'assetRetentionImportance', 'runningCostImportance', 'designImportance', 'performanceImportance', 'fuelImportance', 'spaceImportance', 'lifestylePurposeImportance', 'exteriorAngularity', 'accelerationPreference', 'fuel', 'preferredSize', 'preferredHeight', 'lifestylePurpose', 'chargingAvailable'];
const pick = (source, keys) => Object.fromEntries(keys.filter(key => source?.[key] !== undefined).map(key => [key, source[key]]));
export function recommendationInputPayload(draft, area) {
  const financialInputs = pick(draft, financialKeys);
  const vehiclePreferences = pick(draft.vehicle, vehicleKeys);
  return { ...(area !== 'vehicle' && Object.keys(financialInputs).length ? { financialInputs } : {}), ...(area !== 'financial' && Object.keys(vehiclePreferences).length ? { vehiclePreferences } : {}) };
}

export function mergeRecommendationInputs(saved, draft) {
  return { ...saved?.financialInputs, ...draft, vehicle: { ...saved?.vehiclePreferences, ...draft.vehicle } };
}

export function recommendationQuestionHasError(questionId, errors) {
  const paths = {
    income: ['financialInputs.values.income'],
    expenses: ['financialInputs.values.monthlyExpenses', 'financialInputs.expenseBreakdown'],
    loans: ['financialInputs.loanPayment', 'financialInputs.loanDetails', 'financialInputs.loans'],
    deposit: ['financialInputs.assets.deposit'],
  };
  const prefixes = paths[questionId] ?? [`vehiclePreferences.${questionId}`];
  return errors.some(error => prefixes.some(prefix => error.field === prefix || error.field?.startsWith(`${prefix}.`) || error.field?.startsWith(`${prefix}[`)));
}
