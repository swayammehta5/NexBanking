import { Sun, Moon, Sunrise } from 'lucide-react';
import { useTheme, THEMES } from '../../context/ThemeContext';

const themeConfig = {
  [THEMES.dark]:     { icon: Moon,    label: 'Dark',     next: 'Light' },
  [THEMES.light]:    { icon: Sun,     label: 'Light',    next: 'Sunshine' },
  [THEMES.sunshine]: { icon: Sunrise, label: 'Sunshine', next: 'Dark' },
};

/**
 * ThemeToggle — cycles between dark → light → sunshine → dark
 * Can be rendered as icon-only (compact) or with label (full)
 */
const ThemeToggle = ({ compact = false }) => {
  const { theme, cycleTheme } = useTheme();
  const config = themeConfig[theme] || themeConfig[THEMES.dark];
  const Icon = config.icon;

  return (
    <button
      onClick={cycleTheme}
      title={`Switch to ${config.next} theme`}
      className="btn-ghost flex items-center gap-2 select-none"
      style={{ color: 'var(--text-secondary)' }}
    >
      <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      {!compact && (
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {config.label}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
