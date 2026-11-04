import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { financialSummarySteps, recordSurveyAnswer, surveySummary } from '../../surveySummary.js';
import RecommendationSurvey from '../../components/RecommendationSurvey.jsx';
import SurveyPages from '../../components/SurveyPages.jsx';
import useCandidateRecommendations from './useCandidateRecommendations.js';
import VehicleTastePreview from './VehicleTastePreview.jsx';
import AccelerationPreview from './AccelerationPreview.jsx';
import useRecommendationOptions from '../../useRecommendationOptions.js';
import { createVehiclePreferences } from '../../createVehiclePreferences.js';
import { environmentQuestions, vehicleQuestions } from '../../surveyQuestions.js';
import { readFinancialSession, saveFinancialSession } from '../../financialSession.js';

const reviewQuestion = { id: 'review', category: '마지막 확인', title: '이 조건으로 내 차를 찾아볼까요?', description: '바꾸고 싶은 답이 있다면 수정해 주세요. 예산과 탑승 인원을 먼저 확인한 뒤 취향에 맞는 차를 찾아드려요.' };
export default function FinancialVehiclePage() {
  const { state: routeState } = useLocation();
  const [state] = useState(() => ({ ...readFinancialSession(), ...routeState }));
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(() => createVehiclePreferences(state?.vehicle));
  const [step, setStep] = useState(() => state?.returnToVehicleReview ? vehicleQuestions(createVehiclePreferences(state?.vehicle), state?.vehicle?.scenarioMode ?? true).length : 0);
  const { options, error } = useRecommendationOptions();
  const scenarioMode = options?.scenarioSupported ?? vehicle.scenarioMode ?? true;
  const questions = vehicleQuestions(vehicle, scenarioMode);
  const index = Math.min(step, questions.length);
  const reviewing = index === questions.length;
  const question = reviewing ? reviewQuestion : questions[index];
  const diagnosis = { ...state, vehicle: { ...vehicle, scenarioMode } };
  const { notice, recommending, showRecommendations } = useCandidateRecommendations(diagnosis);
  useEffect(() => { saveFinancialSession({ vehicle }); }, [vehicle]);
  if (!state?.values) return <Navigate to="/financial" replace />;
  const conditions = environmentQuestions(scenarioMode, vehicle);
  const editSummary = id => {
    if (id in financialSummarySteps) { navigate('/financial', { state: { ...diagnosis, financialStep: financialSummarySteps[id] } }); return; }
    const conditionIndex = conditions.findIndex(item => item.id === id);
    if (conditionIndex >= 0) navigate('/financial/environment', { state: { ...diagnosis, environmentStep: conditionIndex } });
    else { const target = questions.findIndex(item => item.id === id); if (target >= 0) setStep(target); }
  };
  return <RecommendationSurvey phase="차량 취향" index={index} total={questions.length + 1} question={question} value={vehicle[question.id]}
    onChange={value => setVehicle(previous => recordSurveyAnswer(previous, question.id, value))}
    onBack={() => index ? setStep(index - 1) : navigate('/financial/environment', { state: { ...diagnosis, environmentStep: conditions.length - 1 } })}
    onNext={() => { if (reviewing) showRecommendations(); else setStep(index + 1); }} nextLabel={reviewing ? '내게 맞는 차량 찾기' : index === questions.length - 1 ? '선택한 답 확인하기' : '다음'}
    busy={recommending} disabled={reviewing && !options} error={error || notice} loading={!options && !error} diagnosis={diagnosis} summaryItems={surveySummary([...conditions, ...questions], vehicle)} onEditSummary={editSummary}>
    {question.id === 'exteriorAngularity' && <VehicleTastePreview preference={question.id} value={vehicle[question.id]} />}
    {question.id === 'accelerationPreference' && <AccelerationPreview value={vehicle[question.id]} />}
    {reviewing && <SurveyPages key={question.id}>{[...conditions, ...questions].map(item => {
      const conditionIndex = conditions.findIndex(condition => condition.id === item.id);
      const answer = item.options.find(option => String(option.value) === String(vehicle[item.id]));
      return <li key={item.id}><span><small>{item.title}</small><strong>{answer?.label ?? '선택 안 함'}</strong></span><button type="button" disabled={recommending} aria-label={`${item.title} 답변 수정`} onClick={() => conditionIndex >= 0 ? navigate('/financial/environment', { state: { ...diagnosis, environmentStep: conditionIndex } }) : setStep(questions.findIndex(q => q.id === item.id))}>수정</button></li>;
    })}</SurveyPages>}
  </RecommendationSurvey>;
}
