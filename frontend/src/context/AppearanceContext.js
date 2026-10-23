import { createContext, useContext } from 'react';

export const AppearanceContext = createContext(null);
export const useAppearance = () => useContext(AppearanceContext);
export const ACCENTS = [
  { id: 'green', name: 'Forest', color: '#23634b', hue: 155 },
  { id: 'blue', name: 'Ocean', color: '#2861bd', hue: 218 },
  { id: 'red', name: 'Ruby', color: '#b13d50', hue: 350 },
  { id: 'purple', name: 'Iris', color: '#7550b4', hue: 265 },
  { id: 'orange', name: 'Amber', color: '#a65b1c', hue: 28 },
];
