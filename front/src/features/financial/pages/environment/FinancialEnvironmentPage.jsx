import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import RecommendationSurvey from '../../components/RecommendationSurvey.jsx';
import { createVehiclePreferences } from '../../createVehiclePreferences.js';
import { environmentQuestions } from '../../surveyQuestions.js';
import { readFinancialSession, saveFinancialSession } from '../../financialSession.js';
import { financialSummarySteps, recordSurveyAnswer, surveySummary } from '../../surveySummary.js';
import useRecommendationOptions from '../../useRecommendationOptions.js';

export default function FinancialEnvironmentPage() {
  const { state: routeState } = useLocation();
  const [state] = useState(() => ({ ...readFinancialSession(), ...routeState }));
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(() => createVehiclePreferences(state?.vehicle));
  const [step, setStep] = useState(() => Math.max(0, Number(routeState?.environmentStep) || 0));
  const { options, error } = useRecommendationOptions();
  const scenarioMode = options?.scenarioSupported ?? vehicle.scenarioMode ?? true;
  const questions = environmentQuestions(scenarioMode, vehicle);
  const index = Math.min(step, questions.length - 1);
  const question = questions[index];
  const diagnosis = { ...state, vehicle: { ...vehicle, scenarioMode } };
  useEffect(() => { saveFinancialSession({ vehicle }); }, [vehicle]);
  if (!state?.values) return <Navigate to="/financial" replace />;
  const editSummary = id => {
    if (id in financialSummarySteps) navigate('/financial', { state: { ...diagnosis, financialStep: financialSummarySteps[id] } });
    else { const target = questions.findIndex(item => item.id === id); if (target >= 0) setStep(target); }
  };
  const next = () => {
    if (index < questions.length - 1) setStep(index + 1);
    else navigate('/financial/vehicle', { state: { ...diagnosis, vehicle: { ...vehicle, scenarioMode }, environmentStep: index } });
  };
  return <RecommendationSurvey phase="이용 조건" index={index} total={questions.length} question={question} value={vehicle[question.id]}
    onChange={value => setVehicle(previous => recordSurveyAnswer(previous, question.id, value))}
    onBack={() => index ? setStep(index - 1) : navigate('/financial', { state: { ...diagnosis, financialStep: 4 } })}
    onNext={next} nextLabel={index === questions.length - 1 ? '이제 차량 취향 고르기' : '다음'}
    disabled={index === questions.length - 1 && !options} error={error} loading={!options && !error} diagnosis={diagnosis} summaryItems={surveySummary(questions, vehicle)} onEditSummary={editSummary} />;
}
