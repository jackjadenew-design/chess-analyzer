import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useI18n } from '../../i18n';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const { strings } = useI18n();

  return (
    <button
      onClick={onToggle}
      title={theme === 'dark' ? strings.theme.switchToLight : strings.theme.switchToDark}
      className="p-2 rounded-lg text-surface-400 hover:text-accent-500 hover:bg-surface-600 transition-all"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};

export default ThemeToggle;
