import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  AlertCircle,
  FileCheck2,
  DollarSign,
  Package,
  Layers,
  RotateCcw,
} from 'lucide-react';
import type { Photo, Project, SelectionStats } from '../../types';
import { Button } from '../ui/Button';
import { resetProjectSelection } from '../../api';
import { copyToClipboard } from '../../utils/clipboard';
import { useTranslation } from '../../i18n/LanguageContext';

interface ConfirmedInspectorProps {
  project: Project;
  photos: Photo[];
  stats: SelectionStats;
  onRefresh: () => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'error') => void;
  onOpenPhotoLightbox: (photo: Photo) => void;
}

export const ConfirmedInspector: React.FC<ConfirmedInspectorProps> = ({
  project,
  photos,
  stats,
  onRefresh,
  onToast,
  onOpenPhotoLightbox,
}) => {
  const { t } = useTranslation();
  const [copiedFilenames, setCopiedFilenames] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Filter only selected photos
  const selectedPhotos = photos.filter((p) => p.selected === 1);

  // Format comma-separated filenames for Adobe Lightroom search / filter
  const commaSeparatedFilenames = selectedPhotos.map((p) => p.filename).join(', ');

  const handleCopyFilenames = async () => {
    if (selectedPhotos.length === 0) {
      onToast('No Selections', t.inspector.noSelectionsYet, 'error');
      return;
    }
    const success = await copyToClipboard(commaSeparatedFilenames);
    if (success) {
      setCopiedFilenames(true);
      onToast(
        t.inspector.copiedLightroom,
        `${selectedPhotos.length} ${t.card.photos}`,
        'success'
      );
      setTimeout(() => setCopiedFilenames(false), 2500);
    } else {
      onToast('Error', 'Failed to copy to clipboard', 'error');
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t.inspector.reopenConfirm)) {
      return;
    }

    try {
      setIsResetting(true);
      await resetProjectSelection(project.id);
      onToast(t.toasts.sessionReopened, t.toasts.sessionReopenedDesc, 'success');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      onToast('Reset Failed', err.message || 'Failed to reset session', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-spring-up">
      {/* Top Banner & Lightroom Action Bar */}
      <div className="apple-glass-bright rounded-3xl p-6 sm:p-8 border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-black/60 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <FileCheck2 className="w-4 h-4" />
              <span>{t.inspector.badgeConfirmed}</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {t.inspector.title}
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              {t.inspector.desc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCopyFilenames}
              icon={copiedFilenames ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40 shadow-emerald-600/30"
            >
              {copiedFilenames ? t.inspector.copiedLightroom : t.inspector.copyLightroom}
            </Button>

            <Button
              variant="ghost"
              size="md"
              onClick={handleReset}
              loading={isResetting}
              icon={<RotateCcw className="w-4 h-4 text-zinc-400" />}
              className="text-zinc-400 hover:text-white"
            >
              {t.inspector.reopenSession}
            </Button>
          </div>
        </div>

        {/* Lightroom Format Preview Box */}
        {selectedPhotos.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="font-mono uppercase tracking-wider text-[11px] text-zinc-500">
                {t.inspector.lightroomPreview}
              </span>
              <span>{selectedPhotos.length} {t.inspector.filesCount}</span>
            </div>
            <div className="bg-black/70 rounded-xl p-3 text-xs font-mono text-zinc-300 border border-white/5 break-all max-h-24 overflow-y-auto selection:bg-apple-accent">
              {commaSeparatedFilenames}
            </div>
          </div>
        )}
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Selected */}
        <div className="apple-glass rounded-2xl p-5 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <Layers className="w-4 h-4 text-apple-accent" />
            <span>{t.inspector.totalSelected}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {stats.selected_count} <span className="text-sm font-normal text-zinc-500">{t.card.photos}</span>
          </div>
        </div>

        {/* Included in Package */}
        <div className="apple-glass rounded-2xl p-5 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <Package className="w-4 h-4 text-blue-400" />
            <span>{t.inspector.includedInTier}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {stats.included_photos} <span className="text-sm font-normal text-zinc-500">{t.card.photos}</span>
          </div>
        </div>

        {/* Extra Photos */}
        <div className="apple-glass rounded-2xl p-5 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>{t.inspector.extraPhotos}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
            +{stats.extra_photos_count} <span className="text-sm font-normal text-zinc-500">{t.inspector.extras}</span>
          </div>
        </div>

        {/* Total Extra Fee */}
        <div className="apple-glass rounded-2xl p-5 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>{t.inspector.extraSurcharge}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
            {stats.extra_fee} <span className="text-sm font-normal text-zinc-500">{project.currency}</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            {stats.extra_photos_count} × {project.extra_photo_price} {project.currency}
          </div>
        </div>
      </div>

      {/* Grid of Selected Photos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white tracking-tight">
            {t.inspector.selectedImages} ({selectedPhotos.length})
          </h3>
          <span className="text-xs text-zinc-500">{t.inspector.inspectHint}</span>
        </div>

        {selectedPhotos.length === 0 ? (
          <div className="apple-glass rounded-3xl p-12 text-center text-zinc-400">
            {t.inspector.noSelectionsYet}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {selectedPhotos.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => onOpenPhotoLightbox(photo)}
                className="group relative aspect-[3/2] rounded-2xl overflow-hidden bg-zinc-900 border border-emerald-500/30 cursor-pointer shadow-lg apple-press hover:border-emerald-400 transition-all"
              >
                <img
                  src={photo.url}
                  alt={photo.filename}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Index badge */}
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono text-zinc-300 border border-white/10">
                  #{idx + 1}
                </div>

                {/* Selection checkmark badge */}
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <Check className="w-3.5 h-3.5" />
                </div>

                {/* Filename footer */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-[11px] font-mono text-zinc-200 truncate">
                  {photo.filename}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
