import { createContext, useContext } from 'react';

export const RecommendationInputsContext = createContext(null);

export function useRecommendationInputSave() {
  return useContext(RecommendationInputsContext);
}
