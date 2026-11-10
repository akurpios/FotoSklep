import React from 'react';
import { CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import type { SelectionStats, Project } from '../../types';
import { Button } from '../ui/Button';
import { useTranslation } from '../../i18n/LanguageContext';

interface StickySelectionBarProps {
  project: Project;
  stats: SelectionStats;
  isLocked: boolean;
  onOpenConfirmation: () => void;
}

export const StickySelectionBar: React.FC<StickySelectionBarProps> = ({
  project,
  stats,
  isLocked,
  onOpenConfirmation,
}) => {
  const { t } = useTranslation();
  const hasSelected = stats.selected_count > 0;
  const isOverIncluded = stats.extra_photos_count > 0;

  return (
    <div className="fixed bottom-6 inset-x-0 z-40 px-4 sm:px-6 pointer-events-none flex justify-center">
      <div className="pointer-events-auto w-full max-w-2xl apple-pill rounded-full p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xl transition-all duration-300">
        {/* Left Stats Section */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isLocked
                ? 'bg-emerald-500/20 text-emerald-400'
                : hasSelected
                ? 'bg-apple-accent/20 text-apple-accent'
                : 'bg-white/10 text-zinc-400'
            }`}
          >
            {isLocked ? (
              <Lock className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                {t.stickyBar.selected} {stats.selected_count}
              </span>
              <span className="text-xs text-zinc-400">
                / {stats.included_photos} {t.stickyBar.ofIncluded}
              </span>
            </div>

            {/* Financial Breakdown */}
            <div className="text-[11px] truncate">
              {isOverIncluded ? (
                <span className="text-amber-400 font-medium">
                  {t.stickyBar.extraPhotos} +{stats.extra_photos_count} (+{stats.extra_fee} {project.currency})
                </span>
              ) : (
                <span className="text-zinc-400">
                  {stats.selected_count < stats.included_photos
                    ? `${stats.included_photos - stats.selected_count} ${t.stickyBar.remaining}`
                    : t.stickyBar.limitReached}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="shrink-0">
          {isLocked ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenConfirmation}
              className="rounded-full bg-emerald-950/60 text-emerald-300 border-emerald-500/30 text-xs px-4"
            >
              {t.stickyBar.viewConfirmed}
            </Button>
          ) : (
            <Button
              variant={hasSelected ? 'primary' : 'secondary'}
              size="sm"
              onClick={onOpenConfirmation}
              disabled={!hasSelected}
              className="rounded-full text-xs sm:text-sm px-4 sm:px-5 shadow-lg"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {t.stickyBar.reviewAndConfirm}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
