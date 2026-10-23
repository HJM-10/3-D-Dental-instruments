import { Check, Moon, Sun } from 'lucide-react';
import { ACCENTS, useAppearance } from '../context/AppearanceContext';

export default function AppearancePanel() {
  const { mode, accent, setMode, setAccent } = useAppearance();
  return <section className="appearance-panel" aria-label="Appearance preferences">
    <div className="appearance-heading"><h3>Make it your own</h3><p>Choose your workspace color and appearance.</p></div>
    <span className="appearance-label">Accent color</span>
    <div className="accent-options">{ACCENTS.map((item) => <button key={item.id} type="button" className={`accent-option ${accent === item.id ? 'selected' : ''}`} aria-label={`${item.name} accent`} aria-pressed={accent === item.id} onClick={() => setAccent(item.id)}>
      <span className="accent-dot" style={{ background: item.color }}>{accent === item.id && <Check size={15} />}</span><span>{item.name}</span>
    </button>)}</div>
    <span className="appearance-label">Appearance</span>
    <div className="appearance-modes">{['light', 'dark'].map((value) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'light' ? <Sun size={17} /> : <Moon size={17} />}{value === 'light' ? 'Light' : 'Dark'}{mode === value && <Check size={15} />}</button>)}</div>
    <p className="appearance-note">Your color carries through to dark mode. Saved for this account on this browser.</p>
  </section>;
}
