import { dreamCarStorageKey } from './dreamCarStorage.js';
import { createProgressPlan, isProgressPlan, planStorageKey, progressStorageKey, updateProgressSettings } from './savingsProgress.js';

export const purchasePlanUpdatedEvent = 'dream-car-purchase-plan-updated';
export function mergeSavingsInputs(plan, patch) {
  if (!plan?.inputs) throw new Error('먼저 구매 계획을 저장해 주세요.');
  const values = Object.fromEntries(['savings', 'monthlySaving', 'targetMonths'].filter(key => key in patch).map(key => [key, patch[key]]));
  if (Object.values(values).some(value => !Number.isFinite(value) || value < 0 || value > 100000000) || 'targetMonths' in values && (!Number.isInteger(values.targetMonths) || values.targetMonths < 1 || values.targetMonths > 1200)) throw new Error('저축 금액과 목표 기간을 확인해 주세요.');
  return { ...plan, inputs: { ...plan.inputs, ...values } };
}
export function syncSavedSavings(patch) {
  const saved = JSON.parse(localStorage.getItem(dreamCarStorageKey(planStorageKey)));
  const next = mergeSavingsInputs(saved, patch);
  localStorage.setItem(dreamCarStorageKey(planStorageKey), JSON.stringify(next));
  window.dispatchEvent(new Event(purchasePlanUpdatedEvent));
}

export function mergeExecutionSettings(active, purchase, target, asOfDate) {
  const next = updateProgressSettings(active, active.startDate || `${active.startMonth}-01`, purchase.inputs.savings, purchase.inputs.targetMonths, purchase.inputs.monthlySaving, asOfDate);
  return { ...next, target, purchaseInputs: { ...purchase.inputs } };
}

export function savePurchasePlanWithProgress(purchase, target, asOfDate, vehicle, { startProgress = true } = {}) {
  const previousPurchase = localStorage.getItem(dreamCarStorageKey(planStorageKey));
  const previousProgress = localStorage.getItem(dreamCarStorageKey(progressStorageKey));
  const plans = previousProgress ? JSON.parse(previousProgress) : [];
  if (!Array.isArray(plans) || !plans.every(isProgressPlan)) throw new Error('저장된 실행 기록을 확인해 주세요.');
  if (plans.length) {
    const index = plans.length - 1;
    const next = mergeExecutionSettings(plans[index], purchase, target, asOfDate);
    plans[index] = { ...next, vehicleId: vehicle.id, name: `${vehicle.brand} ${vehicle.model}`, trim: vehicle.trim };
  }
  if (!plans.length && startProgress) plans.push(createProgressPlan(vehicle, purchase.inputs, target, asOfDate, crypto.randomUUID()));
  try {
    localStorage.setItem(dreamCarStorageKey(planStorageKey), JSON.stringify(purchase));
    if (plans.length) localStorage.setItem(dreamCarStorageKey(progressStorageKey), JSON.stringify(plans));
  } catch (error) {
    if (previousPurchase === null) localStorage.removeItem(dreamCarStorageKey(planStorageKey)); else localStorage.setItem(dreamCarStorageKey(planStorageKey), previousPurchase);
    throw error;
  }
  window.dispatchEvent(new Event(purchasePlanUpdatedEvent));
}
