import React from 'react';
import type { ProjectStatus } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface BadgeProps {
  status: ProjectStatus | string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useTranslation();

  const getBadgeConfig = (statusStr: string) => {
    switch (statusStr) {
      case 'Draft':
        return {
          bg: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/80',
          dot: 'bg-zinc-400',
          label: t.status.Draft,
        };
      case 'Pending Client Selection':
        return {
          bg: 'bg-amber-950/40 text-amber-300 border-amber-600/30',
          dot: 'bg-amber-400 animate-pulse',
          label: t.status['Pending Client Selection'],
        };
      case 'Confirmed by Client':
        return {
          bg: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
          label: t.status['Confirmed by Client'],
        };
      case 'Completed':
        return {
          bg: 'bg-blue-950/40 text-blue-300 border-blue-500/30',
          dot: 'bg-blue-400',
          label: t.status.Completed,
        };
      default:
        return {
          bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          dot: 'bg-zinc-400',
          label: statusStr,
        };
    }
  };

  const config = getBadgeConfig(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border backdrop-blur-md ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};
