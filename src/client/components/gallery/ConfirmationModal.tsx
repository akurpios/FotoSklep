import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Heart,
  Lock,
  Sparkles,
} from 'lucide-react';
import type { Photo, Project, SelectionStats } from '../../types';
import { Button } from '../ui/Button';
import { confirmGallerySelection } from '../../api';
import { useTranslation } from '../../i18n/LanguageContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  project: Project;
  photos: Photo[];
  stats: SelectionStats;
  pin: string;
  isLocked: boolean;
  onClose: () => void;
  onSuccess: (confirmedAt: string) => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'error') => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  project,
  photos,
  stats,
  pin,
  isLocked,
  onClose,
  onSuccess,
  onToast,
}) => {
  const { t, language } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedPhotos = photos.filter((p) => p.selected === 1);

  const handleSubmit = async () => {
    if (!agreed) {
      onToast('Error', 'Please confirm the agreement checkbox', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await confirmGallerySelection(project.slug, pin, true);
      onToast(t.toasts.selectionConfirmed, t.toasts.selectionConfirmedDesc, 'success');
      onSuccess(res.confirmed_at);
      onClose();
    } catch (err: any) {
      console.error(err);
      onToast('Confirmation Failed', err.message || 'Could not finalize selection', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-2xl apple-glass-bright rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 z-10 animate-spring-up overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-apple-accent" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isLocked ? t.confirmModal.titleLocked : t.confirmModal.title}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {isLocked ? t.confirmModal.subtitleLocked : t.confirmModal.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-6 pt-5 overflow-y-auto pr-1 flex-1">
          {/* STEP 1: Chosen Photos Sanity Check Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {t.confirmModal.step1} ({selectedPhotos.length})
              </label>
              <span className="text-[11px] text-zinc-500">{t.confirmModal.step1Hint}</span>
            </div>

            {selectedPhotos.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">{t.confirmModal.noSelected}</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 bg-black/40 rounded-2xl border border-white/5">
                {selectedPhotos.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/10"
                  >
                    <img
                      src={photo.url}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-mono text-zinc-300">
                      #{i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 2: Clear Financial Breakdown */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {t.confirmModal.step2}
            </label>

            <div className="apple-glass rounded-2xl p-4 space-y-3 border border-white/5">
              <div className="flex justify-between text-xs text-zinc-300">
                <span className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  {t.confirmModal.includedCount}
                </span>
                <span className="font-semibold text-white">
                  {stats.included_photos} {t.confirmModal.freeIncluded}
                </span>
              </div>

              <div className="flex justify-between text-xs text-zinc-300">
                <span className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-apple-accent" />
                  {t.confirmModal.totalChosen}
                </span>
                <span className="font-semibold text-white">{stats.selected_count} {t.card.photos}</span>
              </div>

              <div className="flex justify-between text-xs text-amber-300">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  {t.confirmModal.extraPhotosCount}
                </span>
                <span className="font-semibold">
                  +{stats.extra_photos_count}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-bold text-white">{t.confirmModal.surchargeTotal}</span>
                  <p className="text-[11px] text-zinc-400">
                    {t.confirmModal.surchargeNote}
                  </p>
                </div>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {stats.extra_fee} {project.currency}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3 & 4: Confirmation Checkbox & Submit */}
          {!isLocked ? (
            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-white/10 cursor-pointer hover:border-white/20 transition-all select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-apple-accent bg-zinc-800 border-zinc-700 focus:ring-apple-accent focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-zinc-300 leading-relaxed">
                  {t.confirmModal.step3Legal}
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {t.confirmModal.keepBrowsing}
                </Button>
                <Button
                  variant="success"
                  size="lg"
                  loading={isSubmitting}
                  disabled={!agreed || stats.selected_count === 0}
                  onClick={handleSubmit}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 font-semibold"
                >
                  {t.confirmModal.submitBtn}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                {t.confirmModal.confirmedDateNotice}{' '}
                {project.confirmed_at
                  ? new Date(project.confirmed_at).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-US')
                  : ''}
                .
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
